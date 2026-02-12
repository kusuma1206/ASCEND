const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ENFORCED_USER_ID = 'user_123'; // Matches seed

/**
 * GET /api/user/current
 * Returns the single authenticated user.
 * Enforces existence logic.
 */
router.get('/current', async (req, res) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: ENFORCED_USER_ID }
    });

    // Fallback if seed didn't run or DB cleared
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: ENFORCED_USER_ID,
          name: 'Kusuma',
          email: 'kusuma@example.com'
        }
      });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/user/:id
 * Returns a user with their profile and diagnosis results.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        diagnosisResult: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


/**
 * POST /api/user/complete-tour
 * Marks the product tour as completed for the user.
 */
router.post('/complete-tour', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: ENFORCED_USER_ID },
      data: { tourCompleted: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
