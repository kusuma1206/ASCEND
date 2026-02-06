const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../services/dashboardService');

// Single User Enforced ID
const USER_ID = 'user_123';

router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats(USER_ID);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
