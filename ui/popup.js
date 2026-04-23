const btnSearch = document.getElementById('btn-search');
const inputQuery = document.getElementById('query');
const selectType = document.getElementById('search-type');
const resultsDiv = document.getElementById('results');
const statusBar = document.getElementById('status-bar');

const searchIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
let currentLang = localStorage.getItem('clawalpha_lang') || 'en';
let currentSearchType = localStorage.getItem('clawalpha_search_type') || 'Top';
chrome.storage.local.set({ clawalpha_search_type: currentSearchType });

function updateUI() {
  const langSwitch = document.getElementById('lang-switch');
  if (langSwitch) langSwitch.value = currentLang;

  if (inputQuery) inputQuery.placeholder = I18N[currentLang].searchPlaceholder;
  if (btnSearch) {
    btnSearch.title = I18N[currentLang].searchBtn;
    if (!btnSearch.disabled && !btnSearch.innerHTML.includes('...')) {
      btnSearch.innerHTML = searchIconSvg;
    }
  }
  if (statusBar.style.display === 'block') {
    if (statusBar.textContent === I18N['zh'].searching || statusBar.textContent === I18N['en'].searching) {
      statusBar.textContent = I18N[currentLang].searching;
    }
  }

  // Update Settings Modal translations
  const settingTitle = document.getElementById('setting-title');
  if (settingTitle) settingTitle.textContent = I18N[currentLang].systemSettings;
  const settingMaxTweetsLabel = document.getElementById('setting-max-tweets-label');
  if (settingMaxTweetsLabel) settingMaxTweetsLabel.textContent = I18N[currentLang].maxTweetsLimit;
  
  const settingCustomAiLabel = document.getElementById('setting-custom-ai-label');
  if (settingCustomAiLabel) settingCustomAiLabel.textContent = I18N[currentLang].customAiLabel;
  const settingApiUrlLabel = document.getElementById('setting-api-url-label');
  if (settingApiUrlLabel) settingApiUrlLabel.textContent = I18N[currentLang].apiUrlLabel;
  const settingApiKeyLabel = document.getElementById('setting-api-key-label');
  if (settingApiKeyLabel) settingApiKeyLabel.textContent = I18N[currentLang].apiKeyLabel;
  const settingModelLabel = document.getElementById('setting-model-label');
  if (settingModelLabel) settingModelLabel.textContent = I18N[currentLang].modelLabel;

  const settingPromptLabel = document.getElementById('setting-prompt-label');
  if (settingPromptLabel) settingPromptLabel.textContent = I18N[currentLang].aiPromptTemplate;
  const settingSaveBtn = document.getElementById('setting-save-btn');
  if (settingSaveBtn) settingSaveBtn.textContent = I18N[currentLang].saveSettings;
}

document.addEventListener('DOMContentLoaded', () => {
  const langSwitch = document.getElementById('lang-switch');
  if (langSwitch) {
    langSwitch.addEventListener('change', (e) => {
      currentLang = e.target.value;
      localStorage.setItem('clawalpha_lang', currentLang);
      chrome.storage.local.set({ clawalpha_lang: currentLang });
      updateUI();
    });
  }
  if (selectType) {
    selectType.value = currentSearchType;
    selectType.addEventListener('change', (e) => {
      currentSearchType = e.target.value;
      localStorage.setItem('clawalpha_search_type', currentSearchType);
      // 👇 新增这行，将下拉框的选择同步到全局存储，供 content.js 读取
      chrome.storage.local.set({ clawalpha_search_type: currentSearchType });
    });
  }
  updateUI();
});
// Global variables for temporarily storing parallel data, facilitating AI analysis and Modal viewing
let currentOfficialTweets = [];
let currentTokenInfo = null;

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2371767b%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2212%22/%3E%3C/svg%3E';

// Chrome MV3 CSP forbids inline event handlers, use capture-phase global event listener
document.addEventListener('error', function (e) {
  const target = e.target;
  if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
    if (!target.dataset.hasError) {
      target.dataset.hasError = 'true';
      if (target.classList.contains('avatar') || target.style.borderRadius === '50%') {
        target.src = DEFAULT_AVATAR;
      } else {
        target.style.display = 'none';
      }
    }
  }
}, true);

const ICONS = {
  // Like (Outline)
  like: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  // Retweet (Outline)
  retweet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
  // External Link (New)
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>'
};

// Data cleaning function, extracted to frontend for processing
function cleanData(data) {
  if (!data) return null;
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  return data
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/<br>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\\\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

// Record containers corresponding to scopes
const scopeContainers = {
  main: resultsDiv,
  modal: null // Set dynamically in document click events
};

btnSearch.addEventListener('click', () => startSearch());
inputQuery.addEventListener('keypress', (e) => { if (e.key === 'Enter') startSearch(); });

// 👇 When listening to messages, render to the correct location based on scope
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SEARCH_CHUNK') {
    const container = message.scope === 'modal' ? document.getElementById('modal-tweets-container') : resultsDiv;
    if (container) {
      renderTweets(message.data, container);
      if (message.scope === 'main') {
        statusBar.textContent = I18N[currentLang].searchingCount(message.totalCount);
        statusBar.style.display = 'block';
      }
    }
  }

  // 👇 NEW: Listen to webpage requests forwarded from content.js, simulate avatar click logic
  if (message.type === 'OPEN_USER_PROFILE') {
    const screenName = message.screenName;

    // Open Modal panel
    modalOverlay.style.display = 'flex';
    document.getElementById('modal-title').textContent = I18N[currentLang].profile;

    // Construct basic header UI (web terminal may not provide all information, so provide a basic version)
    modalBody.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid var(--border-color); background-color: rgba(29, 155, 240, 0.05);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
          <img src="${DEFAULT_AVATAR}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--bg-primary);">
          <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 18px; color: var(--text-primary); line-height: 1.2;">${screenName}</div>
            <div style="color: var(--text-secondary); font-size: 15px;">@${screenName}</div>
          </div>
          <a href="https://x.com/${screenName}" target="_blank" title="Open in X" style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--text-primary); color: var(--bg-primary); text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        </div>
      </div>
      <div id="modal-tweets-container"></div>
    `;

    const modalContainer = document.getElementById('modal-tweets-container');

    const userData = {
      screenname: screenName,
      author: screenName,
      desc: ''
    };

    // Perform user tweet search (note the addition of from:), and trigger AI profile analysis
    startSearch(`from:${screenName}`, modalContainer, 'modal').then(response => {
      if (response && response.success && response.data.length > 0) {
        generateUserProfileAnalysis(userData, response.data, modalContainer);
      }
    });
  }
});

// 👇 Refactor startSearch: support scope concept, no longer force modification of inputQuery.value
async function startSearch(queryOverride = null, targetContainer = resultsDiv, scope = 'main') {
  const isEvent = queryOverride instanceof Event || (queryOverride && queryOverride.type);
  const finalQuery = (isEvent || !queryOverride) ? inputQuery.value.trim() : queryOverride;

  if (!finalQuery) return null;

  const productType = selectType.value;

  if (scope === 'main') {
    btnSearch.disabled = true;
    btnSearch.innerHTML = '...';
    statusBar.style.display = 'block';
    statusBar.textContent = I18N[currentLang].searching;
    resultsDiv.innerHTML = '';

    // 👇 [Parallel Start 1]: Initialize main search Promise and start AI scheduler
    window.mainSearchPromise = new Promise(resolve => { window.resolveMainTweets = resolve; });
    generateAiSummary(finalQuery, resultsDiv);
  } else {
    if (targetContainer) targetContainer.innerHTML = '';
  }

  try {
    // NEW: Load current crawl count setting, default to 50
    const items = await chrome.storage.local.get({ clawalpha_max_tweets: 50 });
    const maxTweetsCount = items.clawalpha_max_tweets;

    const response = await chrome.runtime.sendMessage({
      type: 'SEARCH',
      query: finalQuery,
      product: productType,
      scope: scope,
      maxTweets: maxTweetsCount // <--- Include this variable
    });

    if (response && response.success && targetContainer) {
      if (scope === 'main') {
        statusBar.textContent = I18N[currentLang].foundCount(response.data.length);
        setTimeout(() => { statusBar.style.display = 'none'; }, 3000);

        // 👇 Notify AI scheduler, tweets are in place
        if (window.resolveMainTweets) window.resolveMainTweets(response.data);
      }
    } else {
      if (scope === 'main') {
        if (window.resolveMainTweets) window.resolveMainTweets([]);

        // 👇 NEW: Detect not logged in error and display eye-catching UI
        const errorMsg = (response && response.error) ? response.error : '';
        if (errorMsg.includes("Please login")) {
          // Status bar red prompt
          statusBar.textContent = I18N[currentLang].notLoggedIn;
          statusBar.style.color = '#f4212e';
          statusBar.style.display = 'block';
          // Restore colors after a few seconds to avoid affecting subsequent normal states
          setTimeout(() => { statusBar.style.color = 'var(--accent-blue)'; }, 4000);

          // Display large icon and jump button in the main content area
          resultsDiv.innerHTML = `
            <div class="empty" style="color:#f4212e; display:flex; flex-direction:column; align-items:center; gap:16px;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <div>${I18N[currentLang].notLoggedIn}</div>
              <a href="https://x.com" target="_blank" style="padding:10px 20px; background:var(--text-primary); color:black; border-radius:24px; text-decoration:none; font-weight:800; font-size:14px;">Go to X.com</a>
            </div>`;
        } else {
          // Original network error fallback
          statusBar.textContent = I18N[currentLang].searchNetError;
          setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
        }
      }
    }

    // 👇 CRITICAL: return the request result, so the place where the avatar is clicked can get the tweets!
    return response;

  } catch (err) {
    if (scope === 'main') {
      statusBar.textContent = I18N[currentLang].searchNetError;
      setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
      if (window.resolveMainTweets) window.resolveMainTweets([]);
    }
    console.error("Search failed", err);
    return null;
  } finally {
    if (scope === 'main') {
      btnSearch.disabled = false;
      btnSearch.innerHTML = searchIconSvg;
      // If the search is interrupted causing it not to hit the success logic, force clean the status bar
      if (statusBar.style.display === 'block' && (statusBar.textContent === I18N['zh'].searching || statusBar.textContent === I18N['en'].searching)) {
        statusBar.style.display = 'none';
      }
    }
  }
}

// Logic for X-style relative time
function getRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  const t = I18N[currentLang];

  if (diffInSeconds < 60) {
    return t.timeSecondsAgo(Math.max(0, diffInSeconds));
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t.timeMinutesAgo(diffInMinutes);
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t.timeHoursAgo(diffInHours);
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t.timeDaysAgo(diffInDays);
  }

  return date.toLocaleDateString(t.locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderTweets(tweets, container = resultsDiv) {
  tweets.forEach(tweet => {
    const card = document.createElement('div');
    card.className = 'tweet-card';

    const name = tweet.author || 'Unknown';
    const screenName = tweet.screenName || 'unknown';
    const timeAgo = getRelativeTime(tweet.createdAt);

    const avatarUrl = tweet.profileImageUrl || DEFAULT_AVATAR;
    const tweetUrl = `https://x.com/${screenName}/status/${tweet.id}`;

    card.innerHTML = `
      <img src="${avatarUrl}" class="avatar" 
           data-screenname="${escapeHtml(screenName)}" 
           data-author="${escapeHtml(name)}"
           data-userid="${tweet.userId}"
           data-desc="${escapeHtml(tweet.description)}"
           data-followers="${tweet.followersCount}"
           data-following="${tweet.followingCount}"
           data-location="${escapeHtml(tweet.location)}"
           title="${I18N[currentLang].viewTweetsTitle(escapeHtml(screenName))}">
      
      <div class="tweet-content">
        <div class="tweet-header">
          <div class="tweet-user-info">
            <span class="tweet-author-name">${escapeHtml(name)}</span>
            <span class="tweet-screen-name">@${escapeHtml(screenName)}</span>
          </div>
        </div>
        <div class="tweet-text">${linkify(escapeHtml(tweet.text))}</div>
        <div class="stats" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="display: flex; gap: 16px;">
            <div class="stat-item likes" title="Likes">
              ${ICONS.like}
              <span>${formatNumber(tweet.likes)}</span>
            </div>
            <div class="stat-item retweets" title="Retweets">
              ${ICONS.retweet}
              <span>${formatNumber(tweet.retweets)}</span>
            </div>
            <a href="${tweetUrl}" target="_blank" class="stat-item open-link" title="Open in X">
              ${ICONS.external}
            </a>
          </div>
          <span class="tweet-date" style="font-size: 13px; color: var(--text-secondary);">${timeAgo}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function formatNumber(num) {
  if (num === 'Unknown' || num === '未知') return I18N[currentLang].unknown;
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num;
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Export data to file
function exportToTxt(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Replace the original openOrFocusAI with the following code
async function openOrFocusAI(payload, aiType) {
  // 1. Get custom configuration from storage
  const items = await chrome.storage.local.get({ clawalpha_prompt: I18N[currentLang].defaultAiPrompt });
  const customPrompt = items.clawalpha_prompt;

  const promptStr = JSON.stringify(payload, null, 2);

  // 2. Concatenate custom prompt and JSON data
  const fullPrompt = customPrompt + "\n\n" + promptStr;

  const performCopyAndSwitch = () => {
    chrome.storage.local.set({ pendingAIPrompt: promptStr }, () => {
      let matchUrl, createUrl;
      if (aiType === 'chatgpt') {
        matchUrl = "*://chatgpt.com/*";
        createUrl = "https://chatgpt.com/";
      } else if (aiType === 'claude') {
        matchUrl = "*://claude.ai/*";
        createUrl = "https://claude.ai/new";
      } else {
        matchUrl = "*://gemini.google.com/*";
        createUrl = "https://gemini.google.com/app";
      }

      chrome.tabs.query({ url: matchUrl }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
          chrome.tabs.create({ url: createUrl });
        }
      });
    });
  };

  // Copy logic remains unchanged...
  const copyText = (text) => {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).catch((err) => {
        console.warn("Navigator clipboard write failed, trying fallback", err);
        throw err;
      });
    }
    return Promise.reject("navigator.clipboard not available");
  };

  copyText(fullPrompt).catch(() => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = fullPrompt;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (e) {
      console.error("Fallback execCommand copy failed", e);
    }
  }).finally(() => {
    performCopyAndSwitch();
  });
}

function linkify(text) {
  return text
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
    .replace(/(^|\s)#(\w+)/g, '$1<a href="https://x.com/hashtag/$2" target="_blank">#$2</a>')
    .replace(/(^|\s)@(\w+)/g, '$1<a href="https://x.com/$2" target="_blank">@$2</a>');
}

