const fs = require('fs');
const path = require('path');

class PromptRegistry {
  constructor() {
    this.prompts = {};
    this.loadPrompts();
  }

  loadPrompts() {
    this.prompts['mockInterviewPrompts'] = require('../prompts/mockInterviewPrompts');
    this.prompts['technicalPrompts'] = require('../prompts/technicalPrompts');
    this.prompts['communicationPrompts'] = require('../prompts/communicationPrompts');
    this.prompts['atsPrompts'] = require('../prompts/atsPrompts');
    this.prompts['careerPrompts'] = require('../prompts/careerPrompts');
  }

  get(templateName, variables = {}) {
    let template = this.prompts[templateName];
    if (!template) {
      // Try loading from file dynamically
      try {
        const filePath = path.join(__dirname, '../prompts', `${templateName}.js`);
        template = require(filePath);
      } catch (e) {
        throw new Error(`Prompt template '${templateName}' not found.`);
      }
    }

    // Replace {{variable}} with value
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }
}

module.exports = new PromptRegistry();
