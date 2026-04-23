// ai-service.js

const AI_SERVICE = {
  /**
   * Use the backend proxy interface at 3002 for AI analysis to protect the plaintext API key.
   */
  async handleAiAnalyzeRequest(payload) {
    try {
      const res = await fetch('https://frenmap.fun/api/token/profile/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
         throw new Error(`HTTP ${res.status}`);
      }
      
      const responseData = await res.json();
      
      // The Node backend usually wraps the response in { code, data, msg }, we only return the actual data payload to the caller
      // This maintains structural consistency with the prior frontend implementation, allowing the popup to seamlessly read `result.data.result`
      return responseData.data || responseData;
    } catch (err) {
      console.error("[AI] API request to frenmap server failed:", err);
      throw err;
    }
  }
};
