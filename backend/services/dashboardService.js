const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WEIGHTS = {
  RESUME: 0.2,
  TECH: 0.3,
  COMM: 0.2,
  INTERVIEW: 0.2,
  ROADMAP: 0.1
};

async function getDashboardStats(userId) {
  // 1. Fetch Latest Data from all modules
  const [
    user,
    atsFn,
    techTests,
    commTest,
    interview,
    roadmap,
    savedOpps,
    activities
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.atsAnalysis.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.technicalTest.findMany({ where: { userId, status: 'COMPLETED' } }),
    prisma.communicationTest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.interviewSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.userRoadmapProgress.findFirst({ where: { userId } }),
    prisma.userOpportunity.count({ where: { userId, status: 'SAVED' } }),
    prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 })
  ]);

  // 2. Calculate Resume Score
  const resumeScore = atsFn ? atsFn.atsScore : 0;
  const resumeStatus = !atsFn ? 'Not Started' : (resumeScore > 70 ? 'Strong' : 'Needs Work');

  // 3. Calculate Technical Score (Average of all completed tests)
  let techScore = 0;
  if (techTests.length > 0) {
    const total = techTests.reduce((sum, t) => sum + (t.totalScore / t.maxScore) * 100, 0);
    techScore = total / techTests.length;
  }
  const techStatus = techTests.length === 0 ? 'Not Started' : (techScore > 70 ? 'Advanced' : 'Intermediate');

  // 4. Communication Score
  const commScore = commTest ? commTest.totalScore : 0; // Assuming stored as 0-100 or normalized
  const commStatus = !commTest ? 'Not Started' : (commScore > 70 ? 'Fluent' : 'Practice Needed');

  // 5. Mock Interview Score
  const interviewScore = interview ? interview.totalScore : 0;
  const interviewStatus = !interview ? 'Not Started' : 'Completed';

  // 6. Roadmap Progress
  let roadmapScore = 0;
  let roadmapMeta = { phase: 1, progress: 0, nextAction: 'Select a Path' };

  if (roadmap) {
    // Determine total tasks (approximation or fetch template)
    // For now, simple progress logic: Phase * 20 (capped) or use task count if strictly needed
    // Let's assume uniform distribution for MVP
    const tasks = roadmap.completedTasks.length;
    roadmapScore = Math.min((tasks / 20) * 100, 100); // 20 tasks = 100%
    roadmapMeta = {
      phase: roadmap.currentPhase,
      progress: Math.round(roadmapScore),
      nextAction: `Continue Phase ${roadmap.currentPhase}`
    };
  }

  // 7. Overall Weighted Score
  const overallScore = Math.round(
    (resumeScore * WEIGHTS.RESUME) +
    (techScore * WEIGHTS.TECH) +
    (commScore * WEIGHTS.COMM) +
    (interviewScore * WEIGHTS.INTERVIEW) +
    (roadmapScore * WEIGHTS.ROADMAP)
  );

  // 8. Verdict & Insight
  let verdict = "Not Ready";
  let color = "red";
  if (overallScore > 70) { verdict = "Industry Ready"; color = "green"; }
  else if (overallScore > 40) { verdict = "Getting There"; color = "orange"; }

  // Determine low hanging fruit
  let insight = "Start your journey by uploading a resume.";
  if (!atsFn) insight = "Upload your resume to get an initial score.";
  else if (techTests.length === 0) insight = "Take a technical test to prove your skills.";
  else if (!commTest) insight = "Test your communication skills to boost your score.";
  else if (overallScore < 50) insight = "Focus on your weakest module to level up.";

  return {
    user: { name: user.name, role: "Student" }, // Add role to User model if needed
    overall: {
      score: overallScore,
      verdict,
      color,
      insight
    },
    modules: {
      resume: { score: Math.round(resumeScore), status: resumeStatus, attempted: !!atsFn },
      technical: { score: Math.round(techScore), status: techStatus, attempted: techTests.length > 0 },
      communication: { score: Math.round(commScore), status: commStatus, attempted: !!commTest },
      interview: { score: Math.round(interviewScore), status: interviewStatus, attempted: !!interview },
      roadmap: roadmapMeta,
      opportunities: { saved: savedOpps }
    },
    activities
  };
}

module.exports = { getDashboardStats };
