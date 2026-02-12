const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ROLE REQUIREMENTS DB (Hardcoded for 2026 Batch logic)
const ROLE_REQUIREMENTS = {
  "AI Engineer": {
    required: ["Python", "Machine Learning", "Data Analysis"],
    minHours: 15,
    matchTemplate: "ai-ml-fast-track-2026"
  },
  "Full Stack Developer": {
    required: ["JavaScript", "React", "Node.js"],
    minHours: 10,
    matchTemplate: "full-stack-career-camp-2026" // Default fallback or similar
  }
};

/**
 * POST /api/diagnosis
 * Runs the Diagnosis Engine Logic on a hypothetical profile.
 * Does NOT save to DB yet (Preview Mode).
 */
router.post('/', async (req, res) => {
  try {
    const { semester, skills, targetRole, weeklyHours } = req.body;

    // 1. Validation
    if (!ROLE_REQUIREMENTS[targetRole]) {
      // Fallback for demo if role not defined
      // return res.status(400).json({ success: false, message: "Role not supported yet." });
    }
    const roleConfig = ROLE_REQUIREMENTS[targetRole] || ROLE_REQUIREMENTS["AI Engineer"];
    const targetTemplateId = roleConfig.matchTemplate;

    // 2. Logic: Skill Match %
    const userSkills = skills.map(s => s.toLowerCase());
    const requiredSkills = roleConfig.required;
    const matchedCount = requiredSkills.filter(r =>
      userSkills.some(u => u.includes(r.toLowerCase()))
    ).length;

    const skillScore = (matchedCount / requiredSkills.length) * 100;

    // 3. Logic: Academic Urgency (Batch 2026 context)
    // Sem 6 is "Urgent", Sem 4 is "Early"
    // Urgency Score: Higher semester = Lower score if skills are missing?
    // Actually: Readiness = (Skill * 0.6) + (UrgencyFactor)
    // Let's define Readiness as "How prepared are you RIGHT NOW?"

    // Base Readiness from skills
    let readinessScore = skillScore * 0.7; // 70% weight on skills

    // Semester Factor
    if (semester >= 6) {
      // Late stage: Penalty if skills undefined, Bonus if ready
      readinessScore += (skillScore > 50 ? 20 : -10);
    } else {
      // Early stage: Bonus for starting early
      readinessScore += 10;
    }

    // Clamp 0-100
    readinessScore = Math.min(Math.max(readinessScore, 0), 100);

    // 4. Critical Gaps
    const criticalGaps = requiredSkills.filter(r =>
      !userSkills.some(u => u.includes(r.toLowerCase()))
    );

    // 5. Risk Factors
    const riskFactors = [];
    if (weeklyHours < roleConfig.minHours) {
      riskFactors.push("High Time Pressure: Role requires more hours than available.");
    }
    if (semester >= 6 && readinessScore < 40) {
      riskFactors.push("Critical Timeline Risk: Placement season approaches.");
    }

    // 6. Prescription
    // For now, mapping to our main AI template, but in future could swap to "Crash Course"
    // If readiness is VERY low (<30) and Late (Sem 6), we might prescribe a different track ideally.
    let prescribedTemplate = targetTemplateId;
    if (semester >= 6 && readinessScore < 30) {
      // Ideally: "foundation-crash-course"
      // For this MVP, we stick to the AI one but flag it.
    }

    res.json({
      success: true,
      diagnosis: {
        readinessScore: Math.round(readinessScore),
        criticalGaps,
        riskFactors,
        prescribedTemplateId: prescribedTemplate,
        verdict: readinessScore > 70 ? "Ready for Capstone" : (readinessScore > 40 ? "On Track" : "Needs Acceleration")
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/diagnosis/confirm
 * Saves the profile and diagnosis, then initializes the roadmap.
 */
router.post('/confirm', async (req, res) => {
  try {
    const { userId, semester, branch, skills, targetRole, weeklyHours, diagnosis } = req.body;

    // 1. Save Profile
    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      update: { semester: parseInt(semester), branch, skills, targetRole, weeklyHours: parseInt(weeklyHours) },
      create: { userId, semester: parseInt(semester), branch, skills, targetRole, weeklyHours: parseInt(weeklyHours), goalMotivation: "Placement" }
    });

    // 2. Save Diagnosis
    await prisma.diagnosisResult.upsert({
      where: { userId },
      update: {
        readinessScore: diagnosis.readinessScore,
        criticalGaps: diagnosis.criticalGaps,
        riskFactors: diagnosis.riskFactors,
        prescribedTemplate: diagnosis.prescribedTemplateId,
        verdict: diagnosis.verdict
      },
      create: {
        userId,
        readinessScore: diagnosis.readinessScore,
        criticalGaps: diagnosis.criticalGaps,
        riskFactors: diagnosis.riskFactors,
        prescribedTemplate: diagnosis.prescribedTemplateId,
        verdict: diagnosis.verdict
      }
    });

    // 3. Initialize Roadmap (Reusing logic from roadmapRoutes essentially)
    // We can just call the DB directly here
    let progress = await prisma.userRoadmapProgress.findFirst({
      where: { userId, templateId: diagnosis.prescribedTemplateId }
    });

    if (!progress) {
      progress = await prisma.userRoadmapProgress.create({
        data: {
          userId,
          templateId: diagnosis.prescribedTemplateId,
          currentPhase: 1,
          completedTasks: []
        }
      });
    }

    res.json({ success: true, message: "Profile saved and Roadmap initialized." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
