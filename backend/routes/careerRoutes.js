const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const promptRegistry = require('../services/promptRegistry');

router.post('/generate-roadmap', async (req, res) => {
  try {
    const { role, skills, timeline, goal } = req.body;

    const prompt = promptRegistry.get('careerPrompts').generateRoadmap
      .replace('{{role}}', role)
      .replace('{{skills}}', skills)
      .replace('{{timeline}}', timeline)
      .replace('{{goal}}', goal);

    const roadmap = await geminiService.generateJSON(prompt, "Career Roadmap Schema");

    res.json({ success: true, data: roadmap });
  } catch (error) {
    console.error("Error generating roadmap:", error);
    res.status(500).json({ success: false, error: "Roadmap generation failed" });
  }
});

router.post('/rank-opportunities', async (req, res) => {
  try {
    const { skills, preferences, opportunities } = req.body;

    const prompt = promptRegistry.get('careerPrompts').rankOpportunities
      .replace('{{skills}}', skills)
      .replace('{{preferences}}', preferences)
      .replace('{{opportunities}}', JSON.stringify(opportunities));

    const ranking = await geminiService.generateJSON(prompt, "Opportunity Ranking Schema");

    res.json({ success: true, data: ranking });
  } catch (error) {
    console.error("Error ranking opportunities:", error);
    res.status(500).json({ success: false, error: "Opportunity ranking failed" });
  }
});

module.exports = router;
