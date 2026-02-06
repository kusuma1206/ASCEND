const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const OPPORTUNITIES_PATH = path.join(__dirname, '../datasets/opportunities.json');

/**
 * GET /api/opportunities
 * Returns all opportunities from JSON (or DB if synced)
 */
router.get('/', async (req, res) => {
  try {
    const { type, mode, difficulty } = req.query;
    let data = JSON.parse(fs.readFileSync(OPPORTUNITIES_PATH, 'utf8'));

    if (type) data = data.filter(o => o.type.toLowerCase() === type.toLowerCase());
    if (mode) data = data.filter(o => o.mode.toLowerCase() === mode.toLowerCase());
    if (difficulty) data = data.filter(o => o.difficulty.toLowerCase() === difficulty.toLowerCase());

    res.json({ success: true, count: data.length, opportunities: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/opportunities/recommendations
 * Intelligence Layer: Ranks opportunities based on student profile.
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { studentProfile } = req.body;
    // Example profile: { batch: "2026", skills: ["Python", "ML"], interests: ["AI"] }

    if (!studentProfile) {
      return res.status(400).json({ success: false, message: "Student profile is required." });
    }

    let opportunities = JSON.parse(fs.readFileSync(OPPORTUNITIES_PATH, 'utf8'));

    // Scoring Logic (WRS - Weighted Relevance Scoring)
    const ranked = opportunities.map(opp => {
      let score = 0;
      const reasons = [];

      // 1. Batch Match (Mandatory/High Weight)
      if (opp.batch_reach.includes(studentProfile.batch)) {
        score += 40;
        reasons.push("Perfect match for your graduation year (2026).");
      }

      // 2. Skill Alignment
      const matchedSkills = opp.requirements.skills.filter(s =>
        studentProfile.skills.some(userSkill => s.toLowerCase().includes(userSkill.toLowerCase()))
      );
      if (matchedSkills.length > 0) {
        score += (matchedSkills.length / opp.requirements.skills.length) * 30;
        reasons.push(`Aligns with your skills: ${matchedSkills.join(', ')}.`);
      }

      // 3. ROI / High Value (Constant for specific providers)
      const highValueProviders = ['Google', 'Amazon', 'Microsoft', 'Govt of India'];
      if (highValueProviders.includes(opp.provider)) {
        score += 20;
        reasons.push("High ROI: Major brand value for your resume.");
      }

      // 4. Mode Preference (Optional)
      if (studentProfile.preferredMode && opp.mode === studentProfile.preferredMode) {
        score += 10;
        reasons.push(`Matches your preference for ${opp.mode} work.`);
      }

      // Add Badges
      const badges = [];
      if (score >= 70) badges.push("Recommended");
      if (highValueProviders.includes(opp.provider)) badges.push("High ROI");
      if (new Date(opp.deadlines.application) - new Date() < 7 * 24 * 60 * 60 * 1000) badges.push("Last Chance");

      return { ...opp, relevanceScore: Math.round(score), reasons, badges };
    });

    // Sort by relevance
    ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({ success: true, recommendations: ranked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/opportunities/sync
 * Syncs JSON items into the PostgreSQL database.
 */
router.post('/sync', async (req, res) => {
  try {
    const opportunities = JSON.parse(fs.readFileSync(OPPORTUNITIES_PATH, 'utf8'));

    for (const opp of opportunities) {
      await prisma.opportunity.upsert({
        where: { id: opp.id },
        update: {
          batchReach: opp.batch_reach,
          type: opp.type,
          title: opp.title,
          provider: opp.provider,
          stipendReward: opp.stipend_reward,
          applicationLink: opp.application_link,
          deadlineApp: opp.deadlines.application ? new Date(opp.deadlines.application) : null,
          deadlineEvent: opp.deadlines.event ? new Date(opp.deadlines.event) : null,
          difficulty: opp.difficulty,
          mode: opp.mode,
          requirements: opp.requirements,
          intelligence: opp.intelligence
        },
        create: {
          id: opp.id,
          batchReach: opp.batch_reach,
          type: opp.type,
          title: opp.title,
          provider: opp.provider,
          stipendReward: opp.stipend_reward,
          applicationLink: opp.application_link,
          deadlineApp: opp.deadlines.application ? new Date(opp.deadlines.application) : null,
          deadlineEvent: opp.deadlines.event ? new Date(opp.deadlines.event) : null,
          difficulty: opp.difficulty,
          mode: opp.mode,
          requirements: opp.requirements,
          intelligence: opp.intelligence
        }
      });
    }

    res.json({ success: true, message: "Opportunities synced with database successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/opportunities/save
 */
router.post('/save', async (req, res) => {
  try {
    const { userId, opportunityId } = req.body;

    // Check if exists
    let existing = await prisma.userOpportunity.findUnique({
      where: { userId_opportunityId: { userId, opportunityId } }
    });

    if (existing) {
      await prisma.userOpportunity.update({
        where: { id: existing.id },
        data: { status: 'SAVED' }
      });
    } else {
      await prisma.userOpportunity.create({
        data: { userId, opportunityId, status: 'SAVED' }
      });
    }

    // LOG
    const { logActivity } = require('../utils/activityLogger');
    await logActivity(userId, "Opportunities", "SAVE", `Saved opportunity: ${opportunityId}`, null, "COMPLETED");

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/opportunities/apply
 */
router.post('/apply', async (req, res) => {
  try {
    const { userId, opportunityId } = req.body;

    // Check if exists
    let existing = await prisma.userOpportunity.findUnique({
      where: { userId_opportunityId: { userId, opportunityId } }
    });

    if (existing) {
      await prisma.userOpportunity.update({
        where: { id: existing.id },
        data: { status: 'APPLIED', appliedAt: new Date() }
      });
    } else {
      await prisma.userOpportunity.create({
        data: { userId, opportunityId, status: 'APPLIED', appliedAt: new Date() }
      });
    }

    // LOG
    const { logActivity } = require('../utils/activityLogger');
    // Fetch title for better log
    const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    await logActivity(userId, "Opportunities", "APPLY", `Applied to ${opp ? opp.title : opportunityId}`, null, "COMPLETED");

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
