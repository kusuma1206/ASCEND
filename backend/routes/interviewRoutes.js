const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getTechnicalQuestions, getHRQuestions, getQuestionById } = require('../utils/datasetLoader');
const { evaluateAnswer } = require('../utils/keywordEvaluator');

const prisma = new PrismaClient();

// HELPER: Get Next Question Logic
async function getNextInteraction(session) {
  // STATE MACHINE
  switch (session.currentStage) {
    case 'GREETING':
      // Move to READINESS immediately after showing greeting? 
      // Actually, frontend starts session. return Greeting.
      // Next call updates to READINESS.
      await prisma.interviewSession.update({
        where: { id: session.id },
        data: { currentStage: 'READINESS' } // Ready for next step
      });
      return {
        type: 'MESSAGE',
        text: `Welcome to your ${session.role} Interview. My name is Ava, your AI interviewer. This session will simulate a real interview experience.`
      };

    case 'READINESS':
      return {
        type: 'QUESTION',
        id: 'readiness_check',
        text: "Are you ready to begin?"
      };

    case 'INTRO':
      // Return Mandatory Intro
      return {
        type: 'QUESTION',
        id: 'intro_q1', // Special ID
        text: "Great. Let's begin. Tell me about yourself."
      };

    case 'MAIN':
      // Existing logic for random Q
      let allQuestions = session.type === 'HR'
        ? getHRQuestions(session.role)
        : getTechnicalQuestions(session.role);

      const attemptedIds = session.attempts.map(a => a.questionId);
      const available = allQuestions.filter(q => !attemptedIds.includes(q.id));

      if (session.attempts.length >= 5 || available.length === 0) {
        // End of Main -> Move to CLOSING
        await prisma.interviewSession.update({
          where: { id: session.id },
          data: { currentStage: 'CLOSING' }
        });
        return {
          type: 'MESSAGE',
          text: "That concludes the questions section."
        };
      }

      const randomQ = available[Math.floor(Math.random() * available.length)];
      return {
        type: 'QUESTION',
        id: randomQ.id,
        text: randomQ.question
      };

    case 'CLOSING':
      // Final message
      return {
        type: 'completed',
        text: "Thank you for your time. I'll now evaluate your responses and generate your feedback report."
      };

    default:
      return { type: 'error', text: "Invalid State" };
  }
}

// 1. START SESSION
router.post('/start-session', async (req, res) => {
  try {
    const { role, type, userId } = req.body;

    // Create with GREETING stage
    const session = await prisma.interviewSession.create({
      data: {
        userId: userId || "guest",
        type: type || "TECHNICAL",
        role: role || "General",
        status: "IN_PROGRESS",
        currentStage: "GREETING",
        totalScore: 0
      }
    });

    res.json({ success: true, sessionId: session.id });
  } catch (e) {
    console.error("Start Session Error", e);
    res.status(500).json({ success: false });
  }
});

// 2. GET NEXT STEP (Replaces get-question)
router.post('/get-next-step', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { attempts: true }
    });

    if (!session) return res.status(404).json({ success: false });

    // Central Logic
    const interaction = await getNextInteraction(session);

    // Check if we need to auto-transition state (e.g. CLOSING)
    if (session.currentStage === 'CLOSING' && interaction.type !== 'completed') {
      // Should not happen if logic is correct
    }

    // Add progress meta
    const progress = session.attempts.length + (session.currentStage === 'MAIN' ? 1 : 0);

    res.json({
      success: true,
      data: {
        id: interaction.id || 'sys_msg',
        question: interaction.text, // mapped to 'question' for frontend comp
        type: interaction.type // MESSAGE or QUESTION
      },
      finished: interaction.type === 'completed',
      progress: Math.min(progress, 5),
      total: 5
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});

// 3. SUBMIT ANSWER (State Aware)
router.post('/submit-answer', async (req, res) => {
  try {
    const { sessionId, answer } = req.body; // Removed questionId dependency for state logic

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) return res.status(404).json({ success: false });

    let feedback = "";
    let score = 0;

    // STATE TRANSITIONS
    if (session.currentStage === 'READINESS') {
      // Check for affirmation
      const lower = answer.toLowerCase();
      const affirmations = ['yes', 'yeah', 'ready', 'sure', 'ok', 'start', 'begin'];
      const isReady = affirmations.some(w => lower.includes(w));

      if (isReady) {
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { currentStage: 'INTRO' }
        });
        feedback = "Great!";
      } else {
        // Stay in READINESS
        feedback = "Take your time.";
        return res.json({ success: true, data: { feedback, score: 0, stay: true } });
      }
    }
    else if (session.currentStage === 'INTRO') {
      // Always accept Intro
      await prisma.questionAttempt.create({
        data: {
          sessionId,
          questionId: 'intro_q1',
          questionText: "Tell me about yourself.",
          userAnswer: answer,
          matchedKeywords: [],
          score: 10, // Full marks for participation
          feedback: "Good introduction."
        }
      });

      // Move to MAIN
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { currentStage: 'MAIN' }
      });
    }
    else if (session.currentStage === 'MAIN') {
      // Need the specific question ID they answered.
      // Frontend should send it, OR we assume it's the valid next one?
      // Let's rely on frontend sending ID or we find the Question object.
      const questionId = req.body.questionId;

      const questionDef = getQuestionById(questionId);
      // Evaluate...
      if (questionDef) {
        const hasAttempts = await prisma.questionAttempt.count({ where: { sessionId } });
        const evalResult = evaluateAnswer(
          answer,
          questionDef.expected_keywords || [],
          questionDef.weightage || {},
          hasAttempts,
          questionDef.feedback_templates,
          0,
          session.type === 'HR'
        );
        score = evalResult.score;
        feedback = evalResult.feedback;

        await prisma.questionAttempt.create({
          data: {
            sessionId,
            questionId,
            questionText: questionDef.question,
            userAnswer: answer,
            score: evalResult.score,
            feedback: evalResult.feedback,
            matchedKeywords: evalResult.matchedKeywords || []
          }
        });

        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { totalScore: { increment: score } }
        });
      }
    }

    res.json({ success: true, data: { score, feedback } });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});

// 4. END SESSION
router.post('/end-session', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", currentStage: "COMPLETED" },
      include: { attempts: true }
    });

    // Log Activity
    const total = session.attempts.length;
    const avg = total > 0 ? (session.totalScore / total).toFixed(1) : 0;

    const { logActivity } = require('../utils/activityLogger');
    await logActivity(
      session.userId,
      "MockInterview",
      "COMPLETE",
      `Mock Interview (${session.role}) completed - Avg Score: ${average}`,
      parseFloat(average),
      "COMPLETED"
    );

    res.json({ success: true, data: { attempts: session.attempts, totalScore: session.totalScore } });
  } catch (e) {
    console.error("End Session Error", e);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
