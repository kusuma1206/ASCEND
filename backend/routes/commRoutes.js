const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { evaluateCommunication, getPerformanceLabel } = require('../utils/commEvaluator');

const prisma = new PrismaClient();
const COMM_DATA_PATH = path.join(__dirname, '../datasets/communications.json');

// Helper to load tasks
const loadCommTasks = () => JSON.parse(fs.readFileSync(COMM_DATA_PATH, 'utf8'));

/**
 * Start a new communication test session
 */
router.post('/start', async (req, res) => {
  try {
    const { userId } = req.body;
    const test = await prisma.communicationTest.create({
      data: {
        userId: userId || null,
        status: 'IN_PROGRESS',
        totalScore: 0
      }
    });

    const tasks = loadCommTasks();
    // Return the test session ID and the list of tasks (prompts only, hide evaluation data)
    res.json({
      testId: test.id,
      tasks: tasks.map(t => ({ id: t.id, type: t.type, prompt: t.prompt, minDuration: t.minDuration, strongResponse: t.strongResponse }))
    });
  } catch (error) {
    console.error('Error starting comm test:', error);
    res.status(500).json({ error: 'Failed to start communication test' });
  }
});

/**
 * Submit an individual task response
 */
router.post('/submit-task', async (req, res) => {
  try {
    const { testId, taskId, transcript, duration } = req.body;

    const allTasks = loadCommTasks();
    const task = allTasks.find(t => t.id === taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const evaluation = evaluateCommunication(task, transcript, duration);

    const result = await prisma.communicationTaskResult.create({
      data: {
        testId,
        taskId,
        taskType: task.type,
        transcript,
        score: evaluation.score,
        duration,
        wordCount: evaluation.metrics.wordCount,
        sentenceCount: evaluation.metrics.sentenceCount,
        connectorCount: evaluation.metrics.connectorCount,
        feedback: evaluation.feedback
      }
    });

    res.json({
      success: true,
      score: evaluation.score,
      feedback: evaluation.feedback
    });
  } catch (error) {
    console.error('Error submitting comm task:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

/**
 * Get final test result
 */
router.get('/result/:testId', async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await prisma.communicationTest.findUnique({
      where: { id: testId },
      include: { tasks: true }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const totalScore = test.tasks.reduce((sum, t) => sum + t.score, 0);
    const maxScore = test.tasks.length * 10;
    const performanceLabel = getPerformanceLabel(totalScore, maxScore);

    // Template-based overall feedback
    let overallFeedback = "";
    if (performanceLabel === "Excellent") {
      overallFeedback = "You demonstrated outstanding communication skills across all task types. Your structure, pacing, and professional delivery are top-tier.";
    } else if (performanceLabel === "Good") {
      overallFeedback = "Your communication is clear and effective. With a bit more focus on using structural connectors, you can reach an excellent level.";
    } else if (performanceLabel === "Average") {
      overallFeedback = "You made a solid attempt and are understandable. Focus on organizing your thoughts before speaking to improve flow.";
    } else {
      overallFeedback = "Keep practicing! Focus on extending your speaking time and using more structured points to explain your ideas.";
    }

    const updatedTest = await prisma.communicationTest.update({
      where: { id: testId },
      data: {
        status: 'COMPLETED',
        totalScore,
        resultLabel: performanceLabel,
        overallFeedback
      }
    });

    res.json({
      totalScore,
      maxScore,
      performanceLabel,
      overallFeedback,
      tasks: test.tasks
    });
  } catch (error) {
    console.error('Error getting comm result:', error);
    res.status(500).json({ error: 'Failed to retrieve result' });
  }
});

module.exports = router;
