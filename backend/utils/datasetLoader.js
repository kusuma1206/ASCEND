const fs = require('fs');
const path = require('path');

// Cache datasets in memory to avoid reading file on every request
let technicalData = null;
let hrData = null;

const TECHNICAL_PATH = path.join(__dirname, '../datasets/technical.json');
const HR_PATH = path.join(__dirname, '../datasets/hr.json');

function loadDatasets() {
  try {
    if (fs.existsSync(TECHNICAL_PATH)) {
      technicalData = JSON.parse(fs.readFileSync(TECHNICAL_PATH, 'utf8'));
    }
    if (fs.existsSync(HR_PATH)) {
      hrData = JSON.parse(fs.readFileSync(HR_PATH, 'utf8'));
    }
    console.log("Datasets loaded successfully.");
  } catch (e) {
    console.error("Error loading datasets:", e);
  }
}

/**
 * Get questions for a specific technical role.
 * @param {string} role e.g., "Java Backend Developer"
 * @returns {Array} List of questions
 */
function getTechnicalQuestions(role) {
  if (!technicalData) loadDatasets();

  // Simple substring match to be forgiving
  const found = technicalData.find(d => d.role.toLowerCase().includes(role.toLowerCase()));
  if (found) return found.questions;

  // Fallback: If role not found, return all technical questions flattened
  // This prevents empty sessions for new roles like 'Full Stack' or 'Data Analyst'
  return technicalData.reduce((acc, current) => {
    return acc.concat(current.questions);
  }, []);
}

/**
 * Get questions for a specific HR category or all HR questions.
 * @param {string} categoryOrRole e.g., "Behavioral" or "General"
 * @returns {Array} List of questions
 */
function getHRQuestions(categoryOrRole) {
  if (!hrData) loadDatasets();

  // Try to find a specific category match
  const found = hrData.find(d => d.category.toLowerCase().includes(categoryOrRole.toLowerCase()));
  if (found) return found.questions;

  // If no category matches, return all questions flattened from all categories
  return hrData.reduce((acc, current) => {
    return acc.concat(current.questions);
  }, []);
}

/**
 * Get a specific question by ID (helper).
 */
function getQuestionById(id) {
  if (!technicalData) loadDatasets();

  // Search both datasets
  for (const group of technicalData) {
    const q = group.questions.find(q => q.id === id);
    if (q) return q;
  }

  if (hrData) {
    for (const group of hrData) {
      const q = group.questions.find(q => q.id === id);
      if (q) return q;
    }
  }
  return null;
}

module.exports = {
  loadDatasets,
  getTechnicalQuestions,
  getHRQuestions,
  getQuestionById
};
