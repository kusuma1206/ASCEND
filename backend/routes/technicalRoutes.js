const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const promptRegistry = require('../services/promptRegistry');
const { v4: uuidv4 } = require('uuid');

// Simple in-memory session store (Not for production scaling, but fits 'Session memory' requirement for MVP)
const sessionStore = new Map();

router.post('/start-test', async (req, res) => {
  try {
    const { skill, difficulty, count = 5 } = req.body;
    const questions = [];
    const testId = uuidv4();

    // Generate questions
    const promptTemplate = promptRegistry.get('technicalPrompts').generateScenarioQuestion;

    // Generate 3 questions for better experience (looping)
    // Using parallel for speed
    const promises = Array.from({ length: 3 }).map(async () => {
      const prompt = promptTemplate
        .replace('{{skill}}', skill)
        .replace('{{difficulty}}', difficulty)
        .replace('{{uniqueId}}', uuidv4());
      return await geminiService.generateJSON(prompt, "MCQ Question Schema");
    });

    const results = await Promise.all(promises);
    questions.push(...results);

    // Store full questions (with answers) server-side
    sessionStore.set(testId, {
      startTime: Date.now(),
      questions: questions
    });

    // Strip answers before sending to client
    const safeQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      codeSnippet: q.codeSnippet
    }));

    res.json({ success: true, testId, questions: safeQuestions });

  } catch (error) {
    console.error("Error starting test:", error);
    res.status(500).json({ success: false, error: "Failed to generate test" });
  }
});

router.post('/submit-test', async (req, res) => {
  try {
    const { testId, answers } = req.body; // answers: { questionId: selectedOption }

    const session = sessionStore.get(testId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Test session not found or expired" });
    }

    let score = 0;
    const results = [];

    for (const q of session.questions) {
      const userAns = answers[q.id];
      const isCorrect = userAns === q.answer;

      if (isCorrect) score++;

      // If wrong, maybe get quick AI feedback? 
      // For now, we return static explanation from generation if available, 
      // or we could generate dynamic feedback here.
      results.push({
        questionId: q.id,
        isCorrect,
        userAnswer: userAns,
        correctAnswer: q.answer,
        explanation: q.explanation // created during generation
      });
    }

    // Cleanup session
    sessionStore.delete(testId);

    res.json({ success: true, score, total: session.questions.length, details: results });

  } catch (error) {
    console.error("Error submitting test:", error);
    res.status(500).json({ success: false, error: "Failed to process results" });
  }
});

module.exports = router;
