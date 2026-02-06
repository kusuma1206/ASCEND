require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

/* ================= INIT APP FIRST ================= */
const app = express();
const PORT = 3002;

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/* ================= ROUTES ================= */
const interviewRoutes = require('./routes/interviewRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes'); // Import roadmap routes

// MOUNT ROUTES
app.use('/api/interview', interviewRoutes);
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/comm', require('./routes/commRoutes'));
app.use('/api/ats', require('./routes/atsRoutes'));
app.use('/api/opportunities', require('./routes/opportunityRoutes'));
app.use('/api/roadmaps', roadmapRoutes); // Use roadmap routes
app.use('/api/diagnosis', require('./routes/diagnosisRoutes')); // New Diagnosis Engine
app.use('/api/user', require('./routes/userRoutes')); // Single User Context
app.use('/api/dashboard', require('./routes/dashboardRoutes')); // Central Dashboard

// Placeholder for other routes if they still exist, otherwise specific ones can be removed
// app.use('/api/technical', technicalRoutes); // migrated to interviewRoutes?
// Keeping others if they are not part of the AI overhaul, but plan said "Strict Non-AI".
// We will keep existing non-conflicting routes if they strictly serve other purposes, 
// but for this task, we focus on interviewRoutes.

/* ================= FOLDERS ================= */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

/* ================= STATIC FILES ================= */
app.use(express.static(path.join(__dirname, "../frontend")));

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log(`   - Mode: STRICT RULE-BASED (No AI)`);
  console.log(`   - Database: Supabase (PostgreSQL)`);
});
