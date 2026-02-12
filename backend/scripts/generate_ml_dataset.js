const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../datasets/ml_engagement_data.json');
const NUM_SAMPLES = 500;

function generateSample(id) {
  // Features: 
  // 0.6*skills + semester factor
  const semester = Math.floor(Math.random() * 8) + 1; // 1-8
  const weeklyHours = Math.floor(Math.random() * 30) + 2; // 2-32 hours

  const resumeScore = Math.floor(Math.random() * 100);
  const techScore = Math.floor(Math.random() * 100);
  const commScore = Math.floor(Math.random() * 100);
  const interviewScore = Math.floor(Math.random() * 100);
  const roadmapProgress = Math.floor(Math.random() * 100);
  const activityCount = Math.floor(Math.random() * 50);

  // Existing rule-based overall score logic (simplified)
  // Overall = 0.2*Resume + 0.3*Tech + 0.2*Comm + 0.2*Interview + 0.1*Roadmap
  const overallScore = (
    (resumeScore * 0.2) +
    (techScore * 0.3) +
    (commScore * 0.2) +
    (interviewScore * 0.2) +
    (roadmapProgress * 0.1)
  );

  // Label: Struggling = 1 if overallScore < 40 or (semester >= 6 and overallScore < 50)
  let isStruggling = overallScore < 40 ? 1 : 0;
  if (semester >= 6 && overallScore < 55) isStruggling = 1; // Stricter for seniors
  if (weeklyHours < 5 && overallScore < 60) isStruggling = 1; // Low time engagement

  return {
    id: `S${id.toString().padStart(4, '0')}`,
    semester,
    weekly_hours: weeklyHours,
    resume_score: resumeScore,
    tech_score: techScore,
    comm_score: commScore,
    interview_score: interviewScore,
    roadmap_progress: roadmapProgress,
    activity_count: activityCount,
    is_struggling: isStruggling
  };
}

const dataset = [];
for (let i = 0; i < NUM_SAMPLES; i++) {
  dataset.push(generateSample(i));
}

fs.writeFileSync(DATA_PATH, JSON.stringify(dataset, null, 2));
console.log(`Successfully generated ${dataset.length} samples in ${DATA_PATH}`);
