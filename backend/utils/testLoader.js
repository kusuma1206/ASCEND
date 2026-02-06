const fs = require('fs');
const path = require('path');

const BASE_PATH = path.join(__dirname, '../datasets/technical-tests');

/**
 * Loads questions for a specific subject and difficulty.
 * @param {string} subject Directory name
 * @param {string} difficulty File name (easy, medium, hard)
 * @returns {Array} List of questions
 */
function loadTestQuestions(subject, difficulty) {
  const filePath = path.join(BASE_PATH, subject.toLowerCase(), `${difficulty.toLowerCase()}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`Test dataset not found: ${filePath}`);
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error parsing test dataset: ${filePath}`, e);
    return [];
  }
}

/**
 * Gets a random set of questions based on difficulty count rules.
 * @param {string} subject 
 * @param {string} difficulty 
 */
function getTestPool(subject, difficulty) {
  const allQuestions = loadTestQuestions(subject, difficulty);

  // Rule-based question count
  let count = 10;
  if (difficulty.toLowerCase() === 'medium') count = 15;
  if (difficulty.toLowerCase() === 'hard') count = 20;

  // Shuffle and pick
  const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Find a specific question by ID across all test datasets (expensive helper)
 */
function getTestQuestionById(subject, difficulty, questionId) {
  const questions = loadTestQuestions(subject, difficulty);
  return questions.find(q => q.id === questionId);
}

module.exports = {
  loadTestQuestions,
  getTestPool,
  getTestQuestionById
};
