const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ROADMAPS_PATH = path.join(__dirname, '../datasets/roadmaps.json');

/**
 * POST /api/roadmaps/sync
 * Syncs the JSON roadmap templates into the database.
 * This is complex because it involves nested relations (Template -> Phases -> Tasks).
 */
router.post('/sync', async (req, res) => {
  try {
    const rawData = fs.readFileSync(ROADMAPS_PATH, 'utf8');
    const templates = JSON.parse(rawData);

    for (const t of templates) {
      // 1. Upsert Template
      const template = await prisma.roadmapTemplate.upsert({
        where: { id: t.id },
        update: {
          title: t.title,
          description: t.description,
          targetBatch: t.target_batch
        },
        create: {
          id: t.id,
          title: t.title,
          description: t.description,
          targetBatch: t.target_batch
        }
      });

      // 2. Handle Phases (Delete existing to ensure clean sync of structure changes)
      // Note: In production, we might want to be more careful, but for this engine, atomic replacement is safer for consistency.
      await prisma.roadmapTask.deleteMany({
        where: { phase: { templateId: template.id } }
      });
      await prisma.roadmapPhase.deleteMany({
        where: { templateId: template.id }
      });

      // 3. Re-create Phases and Tasks
      for (const p of t.phases) {
        const phase = await prisma.roadmapPhase.create({
          data: {
            templateId: template.id,
            phaseNumber: p.phase_number,
            title: p.title,
            durationWeeks: p.duration_weeks,
            description: p.description,
            opportunityUnlockId: p.opportunity_unlock_id
          }
        });

        if (p.tasks && p.tasks.length > 0) {
          await prisma.roadmapTask.createMany({
            data: p.tasks.map(task => ({
              phaseId: phase.id,
              weekNumber: task.week,
              title: task.title,
              type: task.type,
              deliverable: task.deliverable
            }))
          });
        }
      }
    }

    res.json({ success: true, message: "Roadmap templates synced successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/roadmaps/:id
 * Fetches a full roadmap template with all phases and tasks.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const roadmap = await prisma.roadmapTemplate.findUnique({
      where: { id },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            tasks: {
              orderBy: { weekNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!roadmap) {
      return res.status(404).json({ success: false, message: "Roadmap not found." });
    }

    res.json({ success: true, data: roadmap });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/roadmaps/init
 * Initializes a user's progress on a specific roadmap.
 */
router.post('/init', async (req, res) => {
  try {
    const { userId, templateId } = req.body;

    // Check if progress already exists
    let progress = await prisma.userRoadmapProgress.findFirst({
      where: { userId, templateId }
    });

    if (!progress) {
      progress = await prisma.userRoadmapProgress.create({
        data: {
          userId,
          templateId,
          currentPhase: 1,
          completedTasks: []
        }
      });
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/roadmaps/update-progress
 * Marks tasks as completed and Auto-Updates current phase if all tasks in a phase are done.
 */
router.post('/update-progress', async (req, res) => {
  try {
    const { userId, templateId, completedTaskIds } = req.body; // Expects full array of completed IDs

    // Update the record
    const progress = await prisma.userRoadmapProgress.updateMany({
      where: { userId, templateId },
      data: {
        completedTasks: completedTaskIds,
        lastActive: new Date()
      }
    });

    // Check Phase calculation
    // 1. Get total tasks per phase for this template
    const template = await prisma.roadmapTemplate.findUnique({
      where: { id: templateId },
      include: { phases: { include: { tasks: true }, orderBy: { phaseNumber: 'asc' } } }
    });

    let newCurrentPhase = 1;
    for (const phase of template.phases) {
      const taskIds = phase.tasks.map(t => t.id);
      const isPhaseComplete = taskIds.every(id => completedTaskIds.includes(id));

      if (isPhaseComplete) {
        newCurrentPhase = phase.phaseNumber + 1;
      } else {
        break; // Stop at the first incomplete phase
      }
    }

    // Update phase if changed
    await prisma.userRoadmapProgress.updateMany({
      where: { userId, templateId },
      data: { currentPhase: newCurrentPhase }
    });

    // LOG ACTIVITY
    const { logActivity } = require('../utils/activityLogger');
    await logActivity(
      userId,
      "Roadmap",
      "GENERATE",
      `Roadmap Progress: Phase ${newCurrentPhase} reached`,
      newCurrentPhase,
      "IN_PROGRESS"
    );

    res.json({ success: true, currentPhase: newCurrentPhase });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
