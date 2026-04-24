// ai-service.js

const AI_SERVICE = {
  /**
   * Handle AI analysis request. Supports both default proxy and custom API endpoints.
   */
  // Added second parameter onChunk for receiving streaming callbacks
  async handleAiAnalyzeRequest(payload, onChunk) {
    try {
      const settings = await chrome.storage.local.get({
        clawalpha_custom_ai_enabled: false,
        clawalpha_api_url: '',
        clawalpha_api_key: '',
        clawalpha_model: '',
        clawalpha_prompt: 'Summarize the main narrative of this project...'
      });

      let apiUrl, apiKey, model, requestBody, headers;

      if (settings.clawalpha_custom_ai_enabled && settings.clawalpha_api_url && settings.clawalpha_api_key) {
        // [User custom direct AI connection]
        apiUrl = settings.clawalpha_api_url;
        apiKey = settings.clawalpha_api_key;
        model = settings.clawalpha_model || 'gpt-5.4-mini-2026-03-17';

        const promptStr = JSON.stringify(payload, null, 2);
        const fullPrompt = settings.clawalpha_prompt + "\n\n" + promptStr;

        let payloadExt = { stream: true };
        if (typeof AI_PRESETS !== 'undefined') {
          const preset = Object.values(AI_PRESETS).find(p => p.model === settings.clawalpha_model);
          if (preset && preset.payloadExt) payloadExt = { ...payloadExt, ...preset.payloadExt };
        }

        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
        requestBody = { model: model, messages: [{ role: 'user', content: fullPrompt }], ...payloadExt };
      } else {
        // [Proxy server backend request]
        // apiUrl = 'http://localhost:3002/api/token/profile/analyze';
        apiUrl = 'https://xscope.fun/api/token/profile/analyze';
        headers = { 'Content-Type': 'application/json' };
        requestBody = payload;
      }

      const res = await fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify(requestBody) });
      if (!res.ok) throw new Error(`AI API error: ${res.status}`);

      // Handle non-streaming JSON response
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('event-stream') && !contentType.includes('stream')) {
        const json = await res.json();
        const text =
          json.choices?.[0]?.message?.content ||
          json.result ||
          json.content?.[0]?.text ||
          '';
        if (!text) throw new Error('AI returned empty result');
        if (onChunk) onChunk(text);
        return { result: text };
      }

      // ===== Streaming logic =====
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let resultText = '';
      let buffer = '';

      const processLine = (line) => {
        if (!line || line.startsWith(':')) return; // Skip empty lines and SSE comments/heartbeats
        if (line === 'data: [DONE]') return;
        if (!line.startsWith('data: ')) return;

        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.error) {
            throw new Error(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error));
          }
          // Compatible with OpenAI / DeepSeek / Proxy: choices[0].delta.content
          // Compatible with Custom Proxy: chunk
          // Compatible with Claude SSE: delta.text
          const chunkStr =
            parsed.choices?.[0]?.delta?.content ||
            parsed.delta?.text ||
            parsed.chunk ||
            '';
          if (chunkStr) {
            resultText += chunkStr;
            if (onChunk) onChunk(chunkStr);
          }
        } catch (e) {
          console.warn('[AI_SERVICE] Failed to parse line:', line, e);
          if (e.message.includes('API key') || e.message.includes('rate limit')) throw e;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Handle potential tail remaining in buffer
          const tail = buffer.trim();
          if (tail) processLine(tail);
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          processLine(line);
        }
      }

      if (!resultText) throw new Error('AI returned empty result');
      return { result: resultText };
    } catch (err) {
      throw err;
    }
  }
};
