/**
 * Deterministic evaluator for Communication Test tasks.
 * No AI APIs, strictly rule-based logic.
 */

const CONNECTORS = [
  "first", "second", "third", "finally", "lastly",
  "because", "however", "therefore", "consequently",
  "example", "instance", "specifically", "additionally",
  "moreover", "furthermore", "overall", "summary"
];

const FILLER_WORDS = ["um", "uh", "err", "like", "actually", "basically", "you know"];

/**
 * Evaluates a spoken response transcript against task requirements.
 * @param {Object} task The task object from communications.json
 * @param {string} transcript The user's speech-to-text output
 * @param {number} duration The actual speaking duration in seconds
 */
function evaluateCommunication(task, transcript, duration) {
  const words = transcript.toLowerCase().match(/\b(\w+)\b/g) || [];
  const wordCount = words.length;

  // Basic sanity check for silence/refusal
  if (wordCount < 5 || duration < 2) {
    return {
      score: 0,
      feedback: "No meaningful attempt detected. Please try to speak clearly into the microphone.",
      metrics: { wordCount, duration, connectors: 0, sentences: 0 }
    };
  }

  // 1. Metric: Sentences (approximation by word clusters or punctuation if present)
  // STT usually doesn't give punctuation, so we look for pauses or length
  const sentenceCount = Math.max(1, Math.floor(wordCount / 12));

  // 2. Metric: Connectors
  const foundConnectors = CONNECTORS.filter(c => words.includes(c));
  const connectorCount = foundConnectors.length;

  // 3. Metric: Relevance (Structure Points)
  const matchedPoints = task.structurePoints.filter(p => transcript.toLowerCase().includes(p.toLowerCase()));
  const relevanceRatio = matchedPoints.length / task.structurePoints.length;

  // 4. Scoring Logic (Step 7: Effort-Based)
  let score = 2; // Base score for attempt

  // Add for duration
  if (duration >= task.minDuration) score += 2;
  else if (duration >= task.minDuration / 2) score += 1;

  // Add for structure (connectors)
  if (connectorCount >= 3) score += 3;
  else if (connectorCount >= 1) score += 2;

  // Add for relevance
  if (relevanceRatio >= 0.7) score += 3;
  else if (relevanceRatio >= 0.4) score += 2;
  else if (relevanceRatio >= 0.1) score += 1;

  // Cap at 10
  score = Math.min(10, score);

  // 5. Feedback Selection (Step 8)
  let band = "low";
  if (score >= 8) band = "high";
  else if (score >= 5) band = "mid";

  const feedback = task.feedbackTemplates[band];

  return {
    score,
    feedback,
    metrics: {
      wordCount,
      duration,
      connectorCount,
      sentenceCount,
      relevanceRatio,
      matchedPoints
    }
  };
}

/**
 * Maps total score to performance label.
 */
function getPerformanceLabel(totalScore, maxScore) {
  const percentage = (totalScore / maxScore) * 100;
  if (percentage >= 85) return "Excellent";
  if (percentage >= 70) return "Good";
  if (percentage >= 40) return "Average";
  return "Poor";
}

module.exports = {
  evaluateCommunication,
  getPerformanceLabel
};
