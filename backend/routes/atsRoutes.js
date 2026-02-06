const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { parseResume } = require('../utils/atsParser');
const { evaluateATS } = require('../utils/atsEvaluator');

const prisma = new PrismaClient();

// Multer Config: 2MB limit, PDF/DOCX only (Step 2)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter
});

/**
 * Main ATS Analysis Route (Step 1-3, 6-8)
 */
router.post('/analyze-resume', upload.single('resume'), async (req, res) => {
  try {
    const { targetRole, userId } = req.body;

    // Step 4: Role Selection Check
    if (!targetRole) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: "Target Job Role must be selected before analysis." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Resume file is required." });
    }

    // 1. Extract Raw Text (Step 3)
    let resumeText = "";
    if (req.file.mimetype === "application/pdf") {
      const buffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(buffer);
      resumeText = data.text;
    } else {
      const result = await mammoth.extractRawText({ path: req.file.path });
      resumeText = result.value;
    }

    // 2. Parse Sections (Rule-based)
    const parsedSections = parseResume(resumeText);

    // 3. Evaluate ATS Score (Step 6-8)
    const evaluation = evaluateATS(parsedSections, targetRole);

    // 4. Save to Database (Step 11)
    const analysisRecord = await prisma.atsAnalysis.create({
      data: {
        userId: userId || null,
        filename: req.file.originalname,
        targetRole,
        parsedSections,
        atsScore: evaluation.score
      }
    });

    // LOG ACTIVITY
    const { logActivity } = require('../utils/activityLogger');
    await logActivity(
      userId,
      "Resume",
      "UPLOAD",
      `Resume analyzed for ${targetRole} - Score: ${evaluation.score}`,
      evaluation.score,
      "COMPLETED"
    );

    // Cleanup
    try { fs.unlinkSync(req.file.path); } catch (e) { }

    // Final Response (Mandatory Two-Column Format)
    res.json({
      success: true,
      analysisId: analysisRecord.id,
      match_score: evaluation.score,
      atsFeedbackRows: evaluation.atsFeedbackRows,
      summary: evaluation.summary,
      matchStats: evaluation.matchStats,
      parsed_sections: parsedSections
    });

  } catch (error) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) { }
    console.error("ATS Error:", error);
    res.status(500).json({ success: false, error: error.message || "ATS Analysis failed" });
  }
});

module.exports = router;
