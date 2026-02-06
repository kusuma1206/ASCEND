/**
 * Deterministically selects the next question based on current difficulty and interview history.
 * 
 * @param {Object} dataset - The loaded interview dataset object.
 * @param {string} currentDifficulty - The target difficulty (easy, medium, hard).
 * @param {number[]} askedQuestionIds - Array of question IDs already asked.
 * @returns {Object|null} The selected question object or null if none are left.
 */
function selectNextQuestion(dataset, currentDifficulty, askedQuestionIds) {
  if (!dataset || !Array.isArray(dataset.questions)) {
    return null;
  }

  const normalizedDifficulty = currentDifficulty ? currentDifficulty.toLowerCase().trim() : 'medium';

  // Fallback logic definition
  const fallbacks = {
    'easy': ['easy', 'medium'],
    'medium': ['medium', 'easy', 'hard'],
    'hard': ['hard', 'medium']
  };

  const targetDifficulties = fallbacks[normalizedDifficulty] || ['medium', 'easy', 'hard'];

  // Iterate through target difficulties in order of priority
  for (const diff of targetDifficulties) {
    // Filter questions by difficulty and check if they haven't been asked
    const availableQuestions = dataset.questions.filter(q =>
      q.difficulty.toLowerCase() === diff &&
      !askedQuestionIds.includes(q.id)
    );

    if (availableQuestions.length > 0) {
      // Return the first matching question sorted by id (deterministic)
      return availableQuestions.sort((a, b) => a.id - b.id)[0];
    }
  }

  return null;
}

module.exports = { selectNextQuestion };

/**
 * EXAMPLE USAGE:
 * 
 * const { selectNextQuestion } = require('./utils/questionSelector');
 * const dataset = {
 *   role: "Backend Developer",
 *   questions: [
 *     { id: 1, difficulty: "easy", question: "..." },
 *     { id: 2, difficulty: "medium", question: "..." }
 *   ]
 * };
 * 
 * const nextQ = selectNextQuestion(dataset, 'easy', [1]);
 * if (nextQ) {
 *   console.log(`Next Question (${nextQ.difficulty}): ${nextQ.question}`);
 * } else {
 *   console.log("No more questions available.");
 * }
 */
