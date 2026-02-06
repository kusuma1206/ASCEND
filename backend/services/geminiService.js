const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

function logError(message, error) {
  const logPath = path.join(__dirname, "../debug_errors.log");
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\nError Stack: ${error?.stack || error}\n\n`;
  fs.appendFileSync(logPath, logEntry);
}

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY is not set. AI features will fail.");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
  }

  async generateJSON(prompt, schemaDescription = "valid JSON") {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error("Gemini JSON Parse Error:", parseError, "Raw Text:", text);
        throw new Error(`Failed to parse Gemini response as ${schemaDescription}`);
      }
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      logError("Gemini Generation Failed", error);
      throw error;
    }
  }

  /* For non-JSON free-form text */
  async generateText(prompt) {
    const textModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await textModel.generateContent(prompt);
    return result.response.text();
  }
}

module.exports = new GeminiService();
