const fs = require('fs');
const path = require('path');
const { evaluateTestAnswer } = require('../utils/testEvaluator');

const DATA_PATH = path.join(__dirname, '../datasets/eval_test_data.json');

function calculateMetrics(y_true, y_pred) {
  let tp = 0, tn = 0, fp = 0, fn = 0;

  for (let i = 0; i < y_true.length; i++) {
    if (y_true[i] === true && y_pred[i] === true) tp++;
    else if (y_true[i] === false && y_pred[i] === false) tn++;
    else if (y_true[i] === false && y_pred[i] === true) fp++;
    else if (y_true[i] === true && y_pred[i] === false) fn++;
  }

  const accuracy = (tp + tn) / y_true.length;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;

  return { accuracy, precision, recall, f1 };
}

async function runEvaluation() {
  console.log("====================================================");
  console.log("ASCEND Backend Performance Evaluation");
  console.log("Nature: Rule-based / Heuristic Logic");
  console.log("====================================================");

  if (!fs.existsSync(DATA_PATH)) {
    console.error("Error: Test dataset not found at", DATA_PATH);
    return;
  }

  const testData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const y_true = [];
  const y_pred = [];

  testData.forEach((item, index) => {
    // Prepare question object for evaluator
    const question = {
      id: item.questionId,
      question_type: item.question_type,
      correct_answer: item.correct_answer
    };

    const result = evaluateTestAnswer(question, item.userAnswers);

    y_true.push(item.y_true);
    y_pred.push(result.isCorrect);

    console.log(`Test Case ${index + 1}: Expected=${item.y_true}, Predicted=${result.isCorrect}`);
  });

  const metrics = calculateMetrics(y_true, y_pred);

  console.log("----------------------------------------------------");
  console.log("FINAL METRICS:");
  console.log(`Accuracy:  ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`Precision: ${(metrics.precision * 100).toFixed(2)}%`);
  console.log(`Recall:    ${(metrics.recall * 100).toFixed(2)}%`);
  console.log(`F1-score:  ${(metrics.f1 * 100).toFixed(2)}%`);
  console.log("====================================================");
}

runEvaluation();
