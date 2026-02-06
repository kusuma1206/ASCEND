const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getTestPool, getTestQuestionById } = require('../utils/testLoader');
const { evaluateTestAnswer } = require('../utils/testEvaluator');

const prisma = new PrismaClient();

// 1. GET CONFIG (Available subjects)
router.get('/config', (req, res) => {
  res.json({
    subjects: [
      { id: "data-structures", name: "Data Structures" },
      { id: "algorithms", name: "Algorithms" },
      { id: "operating-systems", name: "Operating Systems" },
      { id: "computer-networks", name: "Computer Networks" },
      { id: "dbms", name: "DBMS" },
      { id: "oops", name: "OOPs" },
      { id: "java", name: "Java" },
      { id: "python", name: "Python" },
      { id: "web-technologies", name: "Web Technologies" }
    ],
    difficulties: ["Easy", "Medium", "Hard"]
  });
});

// 2. START TEST
router.post('/start', async (req, res) => {
  try {
    const { subject, difficulty, userId } = req.body;

    const questions = getTestPool(subject, difficulty);
    if (questions.length === 0) {
      return res.status(404).json({ success: false, error: "No questions found for this selection" });
    }

    // Calculate max score
    const maxScore = questions.reduce((acc, q) => acc + (q.marks || 5), 0);

    // Create session
    const test = await prisma.technicalTest.create({
      data: {
        userId: userId || "guest",
        subject,
        difficulty,
        maxScore,
        status: "IN_PROGRESS"
      }
    });

    // Return first question and total metadata
    res.json({
      success: true,
      testId: test.id,
      questions: questions.map(q => ({
        id: q.id,
        text: q.question,
        options: q.options,
        type: q.question_type
      })),
      total: questions.length
    });

  } catch (e) {
    console.error("Start Test Error", e);
    res.status(500).json({ success: false });
  }
});

// 3. SUBMIT ANSWER
router.post('/submit-answer', async (req, res) => {
  try {
    const { testId, questionId, selectedAnswers, subject, difficulty } = req.body;

    // Load question def
    const questionDef = getTestQuestionById(subject, difficulty, questionId);
    if (!questionDef) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }

    // Evaluate
    const { isCorrect, marksAwarded } = evaluateTestAnswer(questionDef, selectedAnswers);

    // Store answer
    await prisma.testAnswer.create({
      data: {
        testId,
        questionId,
        selectedAnswers,
        isCorrect,
        marks: marksAwarded
      }
    });

    // Update test total score
    await prisma.technicalTest.update({
      where: { id: testId },
      data: {
        totalScore: { increment: marksAwarded }
      }
    });

    res.json({ success: true, isCorrect, marksAwarded });

  } catch (e) {
    console.error("Submit Answer Error", e);
    res.status(500).json({ success: false });
  }
});

// 3.5 BULK SUBMIT (For legacy/dashboard UI)
router.post('/submit-bulk', async (req, res) => {
  try {
    const { testId, answers, subject, difficulty } = req.body; // answers: { qId: [ans1, ans2] } or { qId: ans }

    let totalMarks = 0;

    for (const [qId, ans] of Object.entries(answers)) {
      const questionDef = getTestQuestionById(subject, difficulty, qId);
      if (!questionDef) continue;

      const userAnswers = Array.isArray(ans) ? ans : [ans];
      const { isCorrect, marksAwarded } = evaluateTestAnswer(questionDef, userAnswers);

      totalMarks += marksAwarded;

      await prisma.testAnswer.create({
        data: {
          testId,
          questionId: qId,
          selectedAnswers: userAnswers,
          isCorrect,
          marks: marksAwarded
        }
      });
    }

    const test = await prisma.technicalTest.update({
      where: { id: testId },
      data: {
        totalScore: { increment: totalMarks },
        status: "COMPLETED"
      }
    });

    // LOG ACTIVITY
    const { logActivity } = require('../utils/activityLogger');
    await logActivity(
      "user_123", // TODO: Pass real userId from frontend or auth
      "Technical",
      "COMPLETE",
      `${subject} (${difficulty}) Test completed - Score: ${test.totalScore}`,
      test.totalScore,
      "COMPLETED"
    );

    res.json({
      success: true,
      score: test.totalScore,
      maxScore: test.maxScore
    });

  } catch (e) {
    console.error("Bulk Submit Error", e);
    res.status(500).json({ success: false });
  }
});

// 4. GET RESULT
router.get('/result/:testId', async (req, res) => {
  try {
    const { testId } = req.params;

    // Fetch test first to check status
    const existingTest = await prisma.technicalTest.findUnique({
      where: { id: testId },
      include: { answers: true }
    });

    if (!existingTest) {
      return res.status(404).json({ success: false, error: "Test not found" });
    }

    let test = existingTest;

    // Only update and log if not already completed
    if (existingTest.status !== "COMPLETED") {
      test = await prisma.technicalTest.update({
        where: { id: testId },
        data: { status: "COMPLETED" },
        include: { answers: true }
      });

      // LOG ACTIVITY
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(
        test.userId,
        "Technical",
        "COMPLETE",
        `${test.subject} (${test.difficulty}) Test completed - Score: ${test.totalScore}`,
        test.totalScore,
        "COMPLETED"
      );
    }

    const accuracy = ((test.totalScore / test.maxScore) * 100).toFixed(1);

    let label = "Poor";
    let feedback = "You need stronger fundamentals in this subject.";

    if (accuracy >= 90) {
      label = "Excellent";
      feedback = "Excellent performance.";
    } else if (accuracy >= 70) {
      label = "Good";
      feedback = "Good grasp of concepts at this difficulty level.";
    } else if (accuracy >= 40) {
      label = "Average";
      feedback = "You show average understanding with gaps.";
    }

    res.json({
      success: true,
      data: {
        subject: test.subject,
        difficulty: test.difficulty,
        score: test.totalScore,
        maxScore: test.maxScore,
        accuracy,
        label,
        feedback,
        timestamp: test.createdAt
      }
    });

  } catch (e) {
    console.error("Get Result Error", e);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
