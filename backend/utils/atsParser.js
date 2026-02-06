/**
 * Rule-based Resume Parser (Non-AI)
 * Uses text-matching and headers to extract sections.
 */
const fs = require('fs');
const path = require('path');

const KEYWORDS_PATH = path.join(__dirname, '../datasets/ats_keywords.json');

function parseResume(text) {
  const sections = {
    Name: "Missing",
    Email: "Missing",
    Phone: "Missing",
    Skills: "Missing",
    Education: "Missing",
    Experience: "Missing",
    Projects: "Missing",
    Certifications: "Missing"
  };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const keywords = JSON.parse(fs.readFileSync(KEYWORDS_PATH, 'utf8')).sectionKeywords;

  // 1. Basic Info Extraction (Top of the resume usually)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    if (sections.Email === "Missing" && emailRegex.test(line)) {
      sections.Email = line.match(emailRegex)[0];
    }
    if (sections.Phone === "Missing" && phoneRegex.test(line)) {
      sections.Phone = line.match(phoneRegex)[0];
    }
    // Simple heuristic for Name: Usually first non-empty line if not too long
    if (sections.Name === "Missing" && line.length > 3 && line.length < 40 && !line.includes('@')) {
      sections.Name = line;
    }
  }

  // 2. Section Identification
  let currentSection = null;
  const sectionContent = {};

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();

    // Check if line is a header
    let headerFound = false;
    for (const [section, triggerWords] of Object.entries(keywords)) {
      if (triggerWords.some(word => lowerLine === word || lowerLine === word + ":" || lowerLine.startsWith(word + " "))) {
        currentSection = section;
        sectionContent[section] = [];
        headerFound = true;
        break;
      }
    }

    if (!headerFound && currentSection) {
      sectionContent[currentSection].push(line);
    }
  });

  // 3. Consolidate Section Content
  for (const section in sectionContent) {
    if (sectionContent[section].length > 0) {
      sections[section] = sectionContent[section].join('\n');
    }
  }

  return sections;
}

module.exports = { parseResume };
