const fs = require('fs');
const path = require('path');

const CATEGORIES = ["Normal", "Edge", "Invalid", "Conflict"];
const DATA_PATH = path.join(__dirname, '../datasets/research_eval_data.json');

const dataset = [];

// 1. Normal Cases (40)
for (let i = 0; i < 40; i++) {
  const isTrue = i % 2 === 0;
  dataset.push({
    id: `N${i.toString().padStart(3, '0')}`,
    category: "Normal",
    questionType: i % 4 === 0 ? "multi" : "single",
    correctAnswers: ["Option A"],
    userAnswers: isTrue ? ["Option A"] : ["Option B"],
    y_true: isTrue,
    description: `Standard ${isTrue ? 'correct' : 'incorrect'} case.`
  });
}

// 2. Edge Cases (40) - Sensitivity, Ordering
for (let i = 0; i < 40; i++) {
  const isTrue = i % 3 === 0;
  dataset.push({
    id: `E${i.toString().padStart(3, '0')}`,
    category: "Edge",
    questionType: "multi",
    correctAnswers: ["Alpha", "Beta"],
    userAnswers: isTrue ? ["Beta", "Alpha"] : ["alpha", "beta"], // Order independent (true) vs case sensitive (false)
    y_true: isTrue,
    description: `Edge case testing ${isTrue ? 'ordering' : 'case sensitivity'}.`
  });
}

// 3. Invalid / Ambiguous (40)
for (let i = 0; i < 40; i++) {
  dataset.push({
    id: `I${i.toString().padStart(3, '0')}`,
    category: "Invalid",
    questionType: "single",
    correctAnswers: ["A"],
    userAnswers: i % 2 === 0 ? [] : null,
    y_true: false,
    description: `Invalid input: ${i % 2 === 0 ? 'empty array' : 'null'}.`
  });
}

// 4. Rule Conflict (30)
for (let i = 0; i < 30; i++) {
  dataset.push({
    id: `C${i.toString().padStart(3, '0')}`,
    category: "Conflict",
    questionType: "single",
    correctAnswers: ["Correct"],
    userAnswers: ["Correct", "Extra"],
    y_true: false,
    description: "Conflicting rule: Single choice with multiple answers provided."
  });
}

fs.writeFileSync(DATA_PATH, JSON.stringify(dataset, null, 2));
console.log(`Successfully generated ${dataset.length} test cases in ${DATA_PATH}`);
