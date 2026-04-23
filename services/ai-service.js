// ai-service.js

const AI_SERVICE = {
  /**
   * Handle AI analysis request. Supports both default proxy and custom API endpoints.
   */
  async handleAiAnalyzeRequest(payload) {
    try {
      // 1. Fetch settings from storage
      const settings = await chrome.storage.local.get({
        clawalpha_custom_ai_enabled: false,
        clawalpha_api_url: '',
        clawalpha_api_key: '',
        clawalpha_model: '',
        clawalpha_prompt: 'Summarize the main narrative of this project, including specific timelines and key information, and exclude invalid information.'
      });

      // 2. If custom AI is enabled, use the user-provided endpoint
      if (settings.clawalpha_custom_ai_enabled && settings.clawalpha_api_url && settings.clawalpha_api_key) {
        console.log("[AI] Using custom AI provider:", settings.clawalpha_api_url);

        // Construct the same prompt as used in clipboard export
        const promptStr = JSON.stringify(payload, null, 2);
        const fullPrompt = settings.clawalpha_prompt + "\n\n" + promptStr;

        const res = await fetch(settings.clawalpha_api_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.clawalpha_api_key}`
          },
          body: JSON.stringify({
            model: settings.clawalpha_model || 'gpt-5.4-mini-2026-03-17',
            messages: [
              { role: 'user', content: fullPrompt }
            ],
          })
        });

        if (!res.ok) {
          throw new Error(`Custom AI API error: ${res.status}`);
        }

        const responseData = await res.json();
        // Return standard OpenAI response shape or fallback to raw content
        const resultText = responseData.choices?.[0]?.message?.content || responseData.content || responseData.result || "";
        return { result: resultText };
      }

      // 3. Fallback to default proxy service
      console.log("[AI] Using default proxy at frenmap.fun");
      const res = await fetch('https://frenmap.fun/api/token/profile/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Proxy AI HTTP ${res.status}`);
      }

      const responseData = await res.json();
      return responseData.data || responseData;
    } catch (err) {
      console.error("[AI] Analysis failed:", err);
      throw err;
    }
  }
};
