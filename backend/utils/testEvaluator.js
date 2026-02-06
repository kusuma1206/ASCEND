/**
 * Deterministic Test Evaluator
 * No AI. Strict Boolean/Array Matching.
 */

/**
 * Evaluates a test answer.
 * @param {Object} question The question definition from JSON
 * @param {Array<string>} userAnswers The selected option text(s)
 * @returns {Object} { isCorrect, marksAwarded }
 */
function evaluateTestAnswer(question, userAnswers = []) {
  const correctAnswers = question.correct_answer; // Array of correct option strings
  const type = question.question_type; // 'single' or 'multi'
  const marks = question.marks || 5;

  if (type === 'single') {
    // Exactly one correct answer exists
    const isCorrect = userAnswers.length === 1 && userAnswers[0] === correctAnswers[0];
    return {
      isCorrect,
      marksAwarded: isCorrect ? marks : 0
    };
  } else if (type === 'multi') {
    // All correct options must be selected, and NO wrong ones
    if (userAnswers.length !== correctAnswers.length) {
      return { isCorrect: false, marksAwarded: 0 };
    }

    // Sort to compare
    const sortedUser = [...userAnswers].sort();
    const sortedCorrect = [...correctAnswers].sort();

    const isCorrect = sortedUser.every((val, index) => val === sortedCorrect[index]);

    return {
      isCorrect,
      marksAwarded: isCorrect ? marks : 0
    };
  }

  return { isCorrect: false, marksAwarded: 0 };
}

module.exports = { evaluateTestAnswer };
