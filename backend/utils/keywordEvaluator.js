/**
 * strict deterministic evaluator.
 * No AI. No guessing.
 */

/**
 * Evaluates an answer based on strict keyword matching.
 * @param {string} userAnswer 
 * @param {Array<string>} expectedKeywords 
 * @param {Object} weightage (Optional) { "keyword": score }
 * @returns {Object} { score, matched, missing, feedback }
 */
const FEEDBACK_POOLS = {
  POOR: [ // 0-2 (Technical)
    "The answer does not demonstrate understanding of the core concept.",
    "This response is too vague and misses the fundamental idea.",
    "The explanation is incorrect or lacks meaningful technical content."
  ],
  BELOW_AVERAGE: [ // 3-5
    "You identified the topic correctly, but key technical details are missing.",
    "The response shows basic awareness, but lacks depth and clarity.",
    "Important aspects of the concept were not explained clearly."
  ],
  AVERAGE_GOOD: [ // 6-8
    "This is a reasonable explanation, but it can be strengthened with more detail.",
    "You covered the basics, but the explanation lacks completeness.",
    "Good attempt, but additional technical clarity would improve this answer."
  ],
  EXCELLENT: [ // 9-10
    "This is a clear and well-structured explanation.",
    "The answer demonstrates strong conceptual understanding.",
    "Well explained with appropriate technical depth."
  ],
  // NEW HR SPECIFIC POOLS (Effort-based)
  HR_EFFORT: [
    "You've shown good effort in your response. To improve, try using more specific professional examples.",
    "I appreciate the detailed explanation. Adding a structured 'Situation-Action-Result' approach would make this even stronger.",
    "Good start. Expanding on your reasoning would help the interviewer understand your thought process better."
  ],
  HR_WEAK: [
    "I see your attempt, but the response needs more depth and professional framing.",
    "The core idea is there, but try to structure your answer more clearly to highlight your skills.",
    "Consider adding a specific example to illustrate your point more effectively."
  ]
};

/**
 * Evaluates an answer based on strict logic and effort.
 * @param {string} userAnswer 
 * @param {Array<string>} expectedKeywords 
 * @param {Object} weightage (Optional) { "keyword": score }
 * @param {number} questionIndex (Optional) for feedback rotation
 * @param {Object} customTemplates (Optional)
 * @param {number} minLength (Optional) recommended character count
 * @param {boolean} isHR (Optional) Switch to effort-based scoring
 * @returns {Object} { score, matched, missing, feedback }
 */
function evaluateAnswer(userAnswer, expectedKeywords = [], weightage = {}, questionIndex = 0, customTemplates = null, minLength = 0, isHR = false) {
  if (isHR) {
    return evaluateHRAnswer(userAnswer, expectedKeywords, questionIndex, customTemplates, minLength);
  }

  const normalizedAnswer = (userAnswer || "").toLowerCase();
  const answerLength = (userAnswer || "").length;

  const matched = [];
  const missing = [];

  let totalScore = 0;
  let maxPossibleScore = 0;

  expectedKeywords.forEach(keyword => {
    const kLower = keyword.toLowerCase();
    const weight = (weightage && weightage[kLower]) ? weightage[kLower] : 1;

    maxPossibleScore += weight;

    if (normalizedAnswer.includes(kLower)) {
      matched.push(keyword);
      totalScore += weight;
    } else {
      missing.push(keyword);
    }
  });

  // Calculate base score out of 10
  let finalScore = maxPossibleScore > 0
    ? (totalScore / maxPossibleScore) * 10
    : 0;

  // Apply Length Penalty (Up to 30% reduction if extremely short)
  if (minLength > 0 && answerLength < minLength) {
    const ratio = answerLength / minLength;
    const penaltyFactor = 0.7 + (ratio * 0.3); // Scale from 0.7 (max penalty) to 1.0 (no penalty)
    finalScore = finalScore * penaltyFactor;
  }

  const feedback = generateFeedback(finalScore, questionIndex, customTemplates, false);

  return {
    score: parseFloat(finalScore.toFixed(1)),
    matchedKeywords: matched,
    missingKeywords: missing,
    feedback: feedback
  };
}

/**
 * HR Specific Evaluator (Effort-based, subjective)
 */
function evaluateHRAnswer(userAnswer, talkingPoints, questionIndex, customTemplates, minLength) {
  const answer = (userAnswer || "").trim();
  const lowerAnswer = answer.toLowerCase();
  const length = answer.length;

  // 1. ABSOLUTE ZERO CHECK
  const isZero = !answer ||
    lowerAnswer === "i don't know" ||
    lowerAnswer === "idk" ||
    lowerAnswer.length < 5;

  if (isZero) {
    return {
      score: 0.0,
      matchedKeywords: [],
      missingKeywords: talkingPoints,
      feedback: "No meaningful answer provided. Please attempt the question to receive feedback."
    };
  }

  // 2. SCORING FLOOR (Minimum 2/10 for any effort)
  let score = 2.0;

  // 3. EFFORT HEURISTICS

  // a) Length Score (Up to 3 points)
  const targetLength = minLength || 150;
  if (length > targetLength * 1.5) score += 3.0; // Very deep
  else if (length > targetLength) score += 2.0;    // Sufficient
  else if (length > targetLength * 0.5) score += 1.0; // Moderate

  // b) Reasoning Score (Up to 2 points)
  // Keywords indicating structure and depth
  const reasoningTerms = ["because", "why", "reason", "learned", "result", "action", "situation", "example", "instance"];
  let matchedReasoning = 0;
  reasoningTerms.forEach(term => {
    if (lowerAnswer.includes(term)) matchedReasoning++;
  });
  if (matchedReasoning >= 3) score += 2.0;
  else if (matchedReasoning >= 1) score += 1.0;

  // c) Talking Points Coverage (Up to 3 points)
  const matchedPoints = [];
  const missingPoints = [];
  talkingPoints.forEach(p => {
    if (lowerAnswer.includes(p.toLowerCase())) matchedPoints.push(p);
    else missingPoints.push(p);
  });

  const matchRatio = talkingPoints.length > 0 ? matchedPoints.length / talkingPoints.length : 1;
  score += Math.min(3.0, matchRatio * 3.0);

  // 4. CAPS & REFINEMENTS
  const finalScore = Math.min(10.0, score);
  const feedback = generateFeedback(finalScore, questionIndex, customTemplates, true);

  return {
    score: parseFloat(finalScore.toFixed(1)),
    matchedKeywords: matchedPoints,
    missingKeywords: missingPoints,
    feedback: feedback
  };
}

function generateFeedback(score, questionIndex, customTemplates = null, isHR = false) {
  // If custom templates exist, prioritizing them
  if (customTemplates) {
    let key = "poor";
    if (score >= 9) key = "excellent";
    else if (score >= 4) key = "average";

    const template = customTemplates[key];
    if (template) {
      if (Array.isArray(template)) {
        return template[questionIndex % template.length];
      }
      return template;
    }
  }

  // Fallback to global pools
  if (isHR) {
    const pool = score >= 6 ? FEEDBACK_POOLS.HR_EFFORT : FEEDBACK_POOLS.HR_WEAK;
    return pool[questionIndex % pool.length];
  }

  let pool = FEEDBACK_POOLS.POOR;
  if (score >= 9) {
    pool = FEEDBACK_POOLS.EXCELLENT;
  } else if (score >= 6) {
    pool = FEEDBACK_POOLS.AVERAGE_GOOD;
  } else if (score >= 3) {
    pool = FEEDBACK_POOLS.BELOW_AVERAGE;
  }

  return pool[questionIndex % pool.length];
}

module.exports = { evaluateAnswer };
