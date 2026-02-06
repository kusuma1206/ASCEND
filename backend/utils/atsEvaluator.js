/**
 * Standardized Two-Column ATS Evaluator (Rule-Based)
 * Strictly follows the mandatory Error vs. Correction data model.
 */
const fs = require('fs');
const path = require('path');

const KEYWORDS_PATH = path.join(__dirname, '../datasets/ats_keywords.json');

function evaluateATS(parsedSections, targetRoleName) {
  const data = JSON.parse(fs.readFileSync(KEYWORDS_PATH, 'utf8'));
  const role = data.roles.find(r => r.name === targetRoleName);

  if (!role) {
    throw new Error("Invalid target role selected.");
  }

  const atsFeedbackRows = [];
  const scores = { skills: 0, experience: 0, education: 0, structure: 0, density: 0 };
  const normalizedResumeText = Object.values(parsedSections).join(' ').toLowerCase();

  // --- 1. RESUME STRUCTURE ---
  const detected = Object.keys(parsedSections).filter(s => parsedSections[s] !== "Missing");
  const missing = Object.keys(parsedSections).filter(s =>
    parsedSections[s] === "Missing" && !['Name', 'Email', 'Phone'].includes(s)
  );

  if (missing.length > 0) {
    atsFeedbackRows.push({
      section: "Structure",
      error: `❌ Missing Section: ${missing[0]}\nNo ${missing[0]} section detected. ATS systems rely on standard headers to categorize your profile.`,
      correction: `✅ Add a ${missing[0]} section:\nUse a clear, standard header like "${missing[0]}".\n\nExample:\n## ${missing[0]}\n• Add 2-3 relevant items here to demonstrate domain exposure.`,
      impact: "High",
      potentialScoreGain: 10
    });
  } else {
    atsFeedbackRows.push({
      section: "Structure",
      error: "Resume structure is ATS-compatible but lacks optimization for readability.",
      correction: "✅ Optimization Suggestion:\nEnsure your most relevant section (Experience or Skills) appears in the top 30% of the page to catch recruiter attention within 6 seconds.",
      impact: "Low",
      potentialScoreGain: 2
    });
    scores.structure = 10;
  }

  // --- 2. EDUCATION ---
  if (parsedSections.Education !== "Missing") {
    const eduText = parsedSections.Education.toLowerCase();
    const hasDegree = ['btech', 'mtech', 'b.e.', 'm.e.', 'bs', 'ms', 'bachelor', 'master', 'phd'].some(d => eduText.includes(d));
    const hasYear = /\b(20\d{2})\b/.test(eduText);

    if (!hasDegree || !hasYear) {
      atsFeedbackRows.push({
        section: "Education",
        error: `❌ Incomplete Credentials:\n${!hasDegree ? 'Degree title' : 'Graduation year'} not clearly detected. ATS needs specific credentials to verify eligibility for ${targetRoleName} roles.`,
        correction: `✅ Formatting Guidance:\nExplicitly list your degree type and year.\n\nExample:\nBachelor of Technology (Computer Science), 2024\nXYZ University`,
        impact: "Medium",
        potentialScoreGain: 5
      });
      scores.education = 5;
    } else {
      atsFeedbackRows.push({
        section: "Education",
        error: "Education credentials are valid but can be fine-tuned for specialized roles.",
        correction: "✅ Fine-tuning:\nIf applicable, add relevant coursework or GPA (if > 3.5) to boost entry-level rankings for competitive roles.",
        impact: "Low",
        potentialScoreGain: 2
      });
      scores.education = 15;
    }
  } else {
    atsFeedbackRows.push({
      section: "Education",
      error: "❌ Missing Education Section:\nNo academic history found. This is a mandatory filter for 90% of engineering roles.",
      correction: "✅ Addition Required:\nList your highest degree, institution name, and graduation year.\n\nExample:\nBS in Computer Science, 2023\nABC State University",
      impact: "High",
      potentialScoreGain: 15
    });
  }

  // --- 3. SKILLS ---
  const foundRequired = role.requiredSkills.filter(s => normalizedResumeText.includes(s.toLowerCase()));
  const missingRequired = role.requiredSkills.filter(s => !foundRequired.includes(s));
  const skillMatchPct = Math.round((foundRequired.length / role.requiredSkills.length) * 100);

  if (skillMatchPct < 60) {
    atsFeedbackRows.push({
      section: "Skills",
      error: `❌ Low Keyword Match (${skillMatchPct}%):\nMajor tools for ${targetRoleName} are missing: ${missingRequired.slice(0, 3).join(', ')}. This reduces ATS relevance.`,
      correction: `✅ Improve Keyword Density:\nAdd missing tools naturally. Avoid "keyword stuffing" lists; integrate them into projects.\n\nExample:\nSkills: ${missingRequired.slice(0, 3).join(', ')}, Java, React.`,
      impact: "High",
      potentialScoreGain: 20
    });
  } else {
    atsFeedbackRows.push({
      section: "Skills",
      error: "Skills section has good coverage but lacks categorization.",
      correction: "✅ Optimization:\nGroup skills by category (e.g., Languages: ..., Frameworks: ...) for better machine and human readability.",
      impact: "Low",
      potentialScoreGain: 5
    });
  }
  scores.skills = (foundRequired.length / role.requiredSkills.length) * 40;

  // --- 4. PROJECTS / EXPERIENCE ---
  const expText = (parsedSections.Experience + " " + parsedSections.Projects).toLowerCase();
  const hasOutcomes = /%|reduced|increased|improved|saved|efficient/.test(expText);
  const actionVerbs = ['developed', 'implemented', 'managed', 'led', 'designed', 'optimized', 'collaborated', 'built'];
  const foundVerbs = actionVerbs.filter(v => expText.includes(v));

  if (parsedSections.Experience === "Missing" && parsedSections.Projects === "Missing") {
    atsFeedbackRows.push({
      section: "Experience",
      error: "❌ No Professional Evidence:\nNeither work experience nor projects were detected. This prevents ATS from evaluating practical skills.",
      correction: "✅ Immediate Fix:\nAdd a 'Projects' section if you lack work history. Describe what you built and the tools used.\n\nExample:\nProject: Portfolio Site\nTools: React, TailwindCSS\nOutcome: Optimized page speed by 40%.",
      impact: "High",
      potentialScoreGain: 25
    });
  } else if (!hasOutcomes || foundVerbs.length < 3) {
    atsFeedbackRows.push({
      section: "Experience",
      error: `❌ Weak Actionability:\n${!hasOutcomes ? 'No measurable outcomes (%, numbers) found.' : ''} ${foundVerbs.length < 3 ? 'Passive language detected.' : ''} Recruiters value impact.`,
      correction: "✅ Quantify Impact:\nUse strong verbs and add numbers to your bullets.\n\nExample:\n❌ Helped with API.\n✅ Optimized API response time by 30% using Redis caching.",
      impact: "Medium",
      potentialScoreGain: 10
    });
    scores.experience = 10;
  } else {
    atsFeedbackRows.push({
      section: "Experience",
      error: "Experience descriptions are strong but can be polished with STAR method.",
      correction: "✅ Enhancement:\nUse the STAR (Situation, Task, Action, Result) method for even better impact descriptions in your bullets.",
      impact: "Low",
      potentialScoreGain: 5
    });
    scores.experience = 25;
  }

  // --- 5. CERTIFICATIONS ---
  if (parsedSections.Certifications === "Missing") {
    atsFeedbackRows.push({
      section: "Certifications",
      error: "❌ No Certifications Found:\nCertifications help validate specialized skills (AWS, Azure, Coursera) for ${targetRoleName} roles.",
      correction: "✅ Add relevant certs:\nIf you have completed any online specializations, list them clearly with the issuing body and year.",
      impact: "Low",
      potentialScoreGain: 5
    });
  } else {
    atsFeedbackRows.push({
      section: "Certifications",
      error: "Certifications are detected but issuer visibility could be improved.",
      correction: "✅ Check:\nEnsure the certificate name and issuer are explicitly stated without unusual symbols or abbreviations.",
      impact: "Low",
      potentialScoreGain: 2
    });
  }

  // --- FINAL SCORE & SUMMARY ---
  let totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  totalScore += 10; // Density/Base

  if (totalScore < 20) totalScore = 20;
  if (totalScore > 95) totalScore = 95;

  const totalPossibleGain = atsFeedbackRows.reduce((sum, row) => sum + row.potentialScoreGain, 0);
  const estimatedImproved = Math.min(95, totalScore + Math.round(totalPossibleGain * 0.7));

  const summary = `Fixing the high-impact issues above could improve your ATS score from ${totalScore} to approximately ${totalScore + 10}–${estimatedImproved}.`;

  return {
    score: Math.round(totalScore),
    atsFeedbackRows, // Renamed to match mandatory model
    summary,
    matchStats: {
      found: foundRequired,
      missing: missingRequired,
      pct: skillMatchPct
    }
  };
}

module.exports = { evaluateATS };
