/**
 * AI Service Presets Configuration
 * This file contains the latest API endpoints and model names for mainstream AI providers.
 * You can use these as references for the Custom AI settings.
 */

const AI_PRESETS = {
  openai: {
    name: "OpenAI (GPT-5.4)",
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-5.4",
    notes: "Requires OpenAI API Key. Compatible with most ChatGPT-like interfaces."
  },
  claude: {
    name: "Anthropic (claude-opus-4-7)",
    apiUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-opus-4-7",
    notes: "Note: Official Anthropic API uses a different data structure from OpenAI. Ensure your proxy or client supports it."
  },
  gemini: {
    name: "Google (gemini-3.1-pro-preview)",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent",
    model: "gemini-3.1-pro-preview",
    notes: "Google Gemini native API. Use v1beta for latest features."
  },

};

// Exporting it so it can be imported in background scripts if needed (MV3)
if (typeof module !== 'undefined') {
  module.exports = AI_PRESETS;
}
