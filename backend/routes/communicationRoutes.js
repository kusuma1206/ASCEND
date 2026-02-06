const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const promptRegistry = require('../services/promptRegistry');

router.post('/analyze-text', async (req, res) => {
  try {
    const { transcript, topic } = req.body;

    const prompt = promptRegistry.get('communicationPrompts').analyzeFluency
      .replace('{{transcript}}', transcript)
      .replace('{{topic}}', topic || 'General Conversation');

    const analysis = await geminiService.generateJSON(prompt, "Communication Analysis Schema");

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error("Error analyzing communication:", error);
    res.status(500).json({ success: false, error: "Analysis failed" });
  }
});

module.exports = router;
