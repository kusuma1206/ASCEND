const fs = require('fs');
const path = require('path');
const { evaluateTestAnswer } = require('../utils/testEvaluator');

const DATA_PATH = path.join(__dirname, '../datasets/research_eval_data.json');

function calculatePrimaryMetrics(results) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  results.forEach(res => {
    if (res.y_true === true && res.y_pred === true) tp++;
    else if (res.y_true === false && res.y_pred === false) tn++;
    else if (res.y_true === false && res.y_pred === true) fp++;
    else if (res.y_true === true && res.y_pred === false) fn++;
  });

  const accuracy = (tp + tn) / results.length;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;

  return { tp, tn, fp, fn, accuracy, precision, recall, f1 };
}

function calculateRobustnessMetrics(results) {
  const total = results.length;
  let conflictCount = 0;
  let handledInvalid = 0;
  let totalInvalid = 0;

  results.forEach(res => {
    if (res.category === 'Conflict' && res.y_pred === true) {
      // Conflict cases should ideally be false in a strict system
      conflictCount++;
    }
    if (res.category === 'Invalid') {
      totalInvalid++;
      if (res.y_pred === false) handledInvalid++;
    }
  });

  return {
    conflictRate: (conflictCount / results.filter(r => r.category === 'Conflict').length) || 0,
    gracefulDegradation: (handledInvalid / totalInvalid) || 0,
    unhandledRate: 1 - (handledInvalid / totalInvalid) || 0
  };
}

async function runResearchEvaluation() {
  console.log("\n" + "=".repeat(60));
  console.log("RESEARCH-GRADE SYSTEM EVALUATION: ASCEND BACKEND");
  console.log("Methodology: Offline Heuristic Benchmarking");
  console.log("=".repeat(60));

  if (!fs.existsSync(DATA_PATH)) {
    console.error("Critical Error: Evaluation dataset missing.");
    return;
  }

  const testData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const evaluationResults = [];
  const latencies = [];

  testData.forEach((item) => {
    const question = {
      id: item.id,
      question_type: item.questionType,
      correct_answer: item.correctAnswers
    };

    const start = process.hrtime();
    let prediction;
    try {
      const result = evaluateTestAnswer(question, item.userAnswers);
      prediction = result.isCorrect;
    } catch (e) {
      prediction = null; // Unhandled crash
    }
    const diff = process.hrtime(start);
    const latencyMs = (diff[0] * 1e3 + diff[1] * 1e-6);
    latencies.push(latencyMs);

    evaluationResults.push({
      ...item,
      y_pred: prediction
    });
  });

  // Metric Compilations
  const primary = calculatePrimaryMetrics(evaluationResults);
  const robustness = calculateRobustnessMetrics(evaluationResults);

  // Latency distribution
  latencies.sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)];

  // Reporting
  console.log("\n[1] PRIMARY PERFORMANCE METRICS");
  console.log(`- Accuracy:   ${(primary.accuracy * 100).toFixed(2)}%`);
  console.log(`- Precision:  ${(primary.precision * 100).toFixed(2)}%`);
  console.log(`- Recall:     ${(primary.recall * 100).toFixed(2)}%`);
  console.log(`- F1-Score:   ${(primary.f1 * 100).toFixed(2)}%`);

  console.log("\n[2] CONFUSION MATRIX");
  console.log(`          Pred T   Pred F`);
  console.log(`Actual T  ${primary.tp.toString().padEnd(8)} ${primary.fn.toString().padEnd(8)} (TP, FN)`);
  console.log(`Actual F  ${primary.fp.toString().padEnd(8)} ${primary.tn.toString().padEnd(8)} (FP, TN)`);

  console.log("\n[3] ROBUSTNESS & SECURITY METRICS");
  console.log(`- Rule Conflict Rate:        ${(robustness.conflictRate * 100).toFixed(2)}%`);
  console.log(`- Graceful Degradation (Inv): ${(robustness.gracefulDegradation * 100).toFixed(2)}%`);
  console.log(`- Unhandled Exception Rate: ${(robustness.unhandledRate * 100).toFixed(2)}%`);

  console.log("\n[4] EFFICIENCY METRICS");
  console.log(`- Mean Decision Latency:     ${avgLatency.toFixed(4)} ms`);
  console.log(`- 95th Percentile Latency:   ${p95Latency.toFixed(4)} ms`);

  console.log("\n" + "=".repeat(60));
  console.log("EVALUATION COMPLETE");
}

runResearchEvaluation();
