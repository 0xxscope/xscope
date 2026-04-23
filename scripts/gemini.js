console.log("Bird Extension: AI content script loaded.");

function processPrompt(promptStr) {
  const tryInsert = () => {
    // Selectors for Gemini, ChatGPT, and Claude
    const editor = document.getElementById('prompt-textarea') || // ChatGPT
      document.querySelector('.ProseMirror[contenteditable="true"]') || // Claude / generic
      document.querySelector('rich-textarea div.ql-editor') || // Gemini (legacy)
      document.querySelector('rich-textarea [contenteditable="true"]') || // Gemini
      document.querySelector('.ql-editor') ||
      document.querySelector('div[contenteditable="plaintext-only"]') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea');

    if (editor) {
      console.log("Bird Extension: Editor found, focusing.");
      editor.focus();

      // Show user-friendly toast message
      chrome.storage.local.get(['clawalpha_lang'], (result) => {
        const lang = result.clawalpha_lang || 'zh';
        const msg = (I18N[lang] || I18N['zh']).copySuccess;

        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #10a37f;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          z-index: 9999999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          animation: birdSlideIn 0.3s ease-out;
        `;
        document.body.appendChild(toast);

        const style = document.createElement('style');
        style.textContent = `@keyframes birdSlideIn { from { top: -50px; opacity: 0; } to { top: 20px; opacity: 1; } }`;
        document.head.appendChild(style);

        setTimeout(() => {
          toast.style.transition = 'opacity 0.5s';
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 500);
        }, 3500);
      });

      chrome.storage.local.remove('pendingAIPrompt');
    } else {
      setTimeout(tryInsert, 500);
    }
  };

  setTimeout(tryInsert, 800);
}

// 1. Check for pending prompt on page load
chrome.storage.local.get(['pendingAIPrompt'], (result) => {
  if (result.pendingAIPrompt) {
    processPrompt(result.pendingAIPrompt);
  }
});

// 2. Listen for new prompts from background/popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.pendingAIPrompt && changes.pendingAIPrompt.newValue) {
    processPrompt(changes.pendingAIPrompt.newValue);
  }
});
