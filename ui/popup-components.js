// popup-components.js

// Dynamic modal z-index tracking
let modalZIndex = 100;

// Global click event delegation
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('avatar')) {
    openProfileModal(e.target); // Pass real DOM node to prevent src loss
    return;
  }

  const statBtn = e.target.closest('.stat-clickable');
  if (statBtn && statBtn.dataset.userid) {
    openRelationModal(statBtn.dataset.userid, statBtn.dataset.type);
    return;
  }
});

// Data cleaning function (Redefined here to ensure availability in components scope)
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

// ========== CORE: Dynamically Generate Profile Modal ==========
function openProfileModal(target) {
  const dataset = target.dataset;
  const screenName = dataset.screenname;
  if (!screenName) return;

  // Retrieve the actual image URL to prevent blank avatars
  const imgSrc = target.src || (typeof DEFAULT_AVATAR !== 'undefined' ? DEFAULT_AVATAR : '');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  modalZIndex += 10;
  overlay.style.zIndex = modalZIndex;
  overlay.style.display = 'flex';

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">${I18N[currentLang].profile}</span>
        <div class="modal-close" style="cursor: pointer; width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;">✕</div>
      </div>
      <div class="modal-body" style="flex: 1; overflow-y: auto; padding-bottom: 20px;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const modalBody = overlay.querySelector('.modal-body');
  overlay.querySelector('.modal-close').addEventListener('click', () => {
    overlay.remove(); // Completely destroy modal DOM
    modalZIndex -= 10;
  });

  // Safely handle follower counts (avoid NaN if "unknown")
  let followersVal = dataset.followers || I18N[currentLang].unknown;
  let followingVal = dataset.following || I18N[currentLang].unknown;
  if (!isNaN(followersVal) && String(followersVal).trim() !== '') followersVal = formatNumber(followersVal);
  if (!isNaN(followingVal) && String(followingVal).trim() !== '') followingVal = formatNumber(followingVal);

  // Create a unique container ID to prevent rendering collisions
  const uniqueId = 'tweets-container-' + Date.now() + Math.floor(Math.random() * 1000);

  modalBody.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid var(--border-color); background-color: rgba(29, 155, 240, 0.05);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
        <img src="${imgSrc}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--bg-primary);">
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 18px; color: var(--text-primary); line-height: 1.2;">${dataset.author || screenName}</div>
          <div style="color: var(--text-secondary); font-size: 15px;">@${screenName}</div>
        </div>
        <a href="https://x.com/${screenName}" target="_blank" title="Open in X" style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--text-primary); color: var(--bg-primary); text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
      </div>
      ${dataset.desc && dataset.desc !== 'undefined' ? `<div style="font-size: 14px; line-height: 1.5; color: var(--text-primary); margin-bottom: 10px;">${dataset.desc}</div>` : ''}
      <div style="display: flex; gap: 16px; font-size: 14px;">
        <div class="stat-clickable" data-userid="${dataset.userid || ''}" data-type="following" style="cursor: pointer;">
          <span style="color: var(--text-primary); font-weight: 700;">${followingVal}</span> <span style="color: var(--text-secondary);">${I18N[currentLang].following}</span>
        </div>
        <div class="stat-clickable" data-userid="${dataset.userid || ''}" data-type="followers" style="cursor: pointer;">
          <span style="color: var(--text-primary); font-weight: 700;">${followersVal}</span> <span style="color: var(--text-secondary);">${I18N[currentLang].followers}</span>
        </div>
        ${dataset.location && dataset.location !== 'undefined' ? `<div style="color: var(--text-secondary);">📍 ${dataset.location}</div>` : ''}
      </div>
    </div>
    <div id="${uniqueId}">
      <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
        <svg class="spin-anim" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block; margin: 0 auto 10px auto;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <div style="margin-top: 10px;">${I18N[currentLang].searching || 'Searching...'}</div>
      </div>
    </div>
  `;

  const modalContainer = document.getElementById(uniqueId);
  // Generate a unique scope to prevent data mixing between concurrent modals
  const uniqueScope = 'modal_' + Date.now() + Math.floor(Math.random() * 1000);

  // Directly invoke search via background message, bypassing the buggy legacy startSearch
  chrome.runtime.sendMessage({
    type: 'SEARCH',
    query: `from:${screenName}`,
    product: 'Latest', // Force Latest sorting
    scope: uniqueScope,
    maxTweets: 50
  }).then(response => {
    modalContainer.innerHTML = ''; // Remove loading animation
    if (response && response.success && response.data && response.data.length > 0) {
      // Once data is successfully fetched, use the global renderTweets utility
      if (typeof renderTweets === 'function') {
        renderTweets(response.data, modalContainer);
      }
    } else {
      modalContainer.innerHTML = `<div class="empty" style="padding: 20px; text-align: center; color: var(--text-secondary);">${I18N[currentLang].noData || 'No recent tweets.'}</div>`;
    }
  }).catch(err => {
    modalContainer.innerHTML = `<div class="error" style="padding: 20px; text-align: center; color: #f4212e;">Search failed.</div>`;
  });
}

// ========== CORE: Dynamically Generate Relation List Modal ==========
function openRelationModal(userId, relationType) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  modalZIndex += 10;
  overlay.style.zIndex = modalZIndex;
  overlay.style.display = 'flex';

  const title = relationType === 'followers' ? I18N[currentLang].followers : I18N[currentLang].following;

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <div class="modal-close" style="cursor: pointer; width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;">✕</div>
      </div>
      <div class="modal-body" style="flex: 1; overflow-y: auto; padding-bottom: 20px;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const modalBody = overlay.querySelector('.modal-body');
  overlay.querySelector('.modal-close').addEventListener('click', () => {
    overlay.remove();
    modalZIndex -= 10;
  });

  let cursor = null;
  let isFetching = false;

  async function loadUsers() {
    if (isFetching) return;
    isFetching = true;

    const loader = document.createElement('div');
    loader.className = 'loading-trigger';
    loader.textContent = I18N[currentLang].loading;
    modalBody.appendChild(loader);

    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_USERS',
      userId: userId,
      relationType: relationType,
      cursor: cursor
    });

    loader.remove();
    isFetching = false;

    if (response.success) {
      const { users, cursor: nextCursor } = response.data;
      cursor = nextCursor;

      users.forEach(u => {
        const item = document.createElement('div');
        item.className = 'user-list-item';
        item.innerHTML = `
          <img src="${u.avatar || DEFAULT_AVATAR}" class="avatar" 
               data-screenname="${u.screenName}" 
               data-author="${escapeHtml(u.name)}" 
               data-desc="${escapeHtml(u.desc)}" 
               data-userid="${u.id}" 
               data-followers="${u.followersCount !== undefined ? u.followersCount : I18N[currentLang].unknown}" 
               data-following="${u.followingCount !== undefined ? u.followingCount : I18N[currentLang].unknown}" 
               style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
          <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center; pointer-events: none;">
            <div style="font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(u.name)}</div>
            <div style="color: var(--text-secondary); font-size: 13px;">@${escapeHtml(u.screenName)}</div>
          </div>
        `;
        item.addEventListener('click', (e) => {
          if (!e.target.classList.contains('avatar')) {
            item.querySelector('.avatar').click();
          }
        });
        modalBody.appendChild(item);
      });

      if (cursor && users.length > 0) {
        const trigger = document.createElement('div');
        trigger.className = 'loading-trigger';
        trigger.textContent = I18N[currentLang].slideLoadMore;
        modalBody.appendChild(trigger);

        const localObserver = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            localObserver.unobserve(entries[0].target);
            entries[0].target.remove();
            loadUsers();
          }
        }, { root: modalBody, threshold: 0.1 });
        localObserver.observe(trigger);
      } else if (users.length === 0 && !cursor) {
        modalBody.innerHTML += `<div class="empty" style="padding: 20px; text-align: center;">${I18N[currentLang].noMore}</div>`;
      }
    } else {
      let errorText = response.error;
      if (errorText && errorText.includes("Please login")) {
        errorText = I18N[currentLang].notLoggedIn;
      } else {
        errorText = I18N[currentLang].loadFailed(response.error);
      }
      modalBody.innerHTML += `<div style="color: #f4212e; text-align: center; padding: 40px 20px; font-weight: bold;">
           <div>${errorText}</div>
           ${errorText === I18N[currentLang].notLoggedIn ? `<a href="https://x.com" target="_blank" style="display:inline-block; margin-top:16px; padding:8px 16px; background:var(--text-primary); color:black; border-radius:24px; text-decoration:none; font-size:14px;">🔗 Go to login</a>` : ''}
         </div>`;
    }
  }
  loadUsers();
}

// AI Scheduler: manage parallel data streams and deep analysis
async function generateAiSummary(query, container) {
  const isAddress = query && (query.length >= 32 || query.trim().startsWith('0x'));
  if (!isAddress) return;

  const analysisWrapper = document.createElement('div');
  container.insertBefore(analysisWrapper, container.firstChild);

  // 1. Render token profile card container (only for addresses)
  let tokenCard = null;
  if (isAddress) {
    tokenCard = document.createElement('div');
    tokenCard.style.cssText = `padding: 16px; margin: 12px 16px 4px 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 12px;`;
    tokenCard.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 14px;">
        <svg class="spin-anim" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>${I18N[currentLang].fetchingToken}</span>
      </div>
    `;
    analysisWrapper.appendChild(tokenCard);
  }

  // 2. Render AI summary container
  const summaryBox = document.createElement('div');
  summaryBox.style.cssText = `padding: 16px; margin: 12px 16px; background: linear-gradient(145deg, rgba(29, 155, 240, 0.08), rgba(29, 155, 240, 0.02)); border: 1px solid rgba(29, 155, 240, 0.3); border-radius: 12px;`;
  summaryBox.innerHTML = `
    <div style="font-weight: bold; color: var(--accent-blue); display: flex; align-items: center; gap: 8px; font-size: 14px;">
      <svg class="spin-anim" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>
      <span>${I18N[currentLang].analyzingNarrative}</span>
    </div>
  `;
  analysisWrapper.appendChild(summaryBox);

  // --- Start parallel logic ---

  // [Parallel Start 2]: Query token details (only for addresses)
  let tokenFetchTask = Promise.resolve(null);
  if (isAddress) {
    tokenFetchTask = TOKEN_SERVICE.getTokenInfo(query)
      .then(async info => {
        if (!info) throw "no info";
        currentTokenInfo = info;
        renderTokenCardUI(tokenCard, info);

        if (info.twitterLink) {
          const handle = info.twitterLink.split('/').pop();
          window.currentOfficialTweetsPromise = chrome.runtime.sendMessage({
            type: 'SEARCH', query: `from:${handle}`, product: 'Latest', scope: 'silent'
          }).then(res => {
            currentOfficialTweets = res.success ? res.data : [];
            return currentOfficialTweets;
          });
        } else {
          window.currentOfficialTweetsPromise = Promise.resolve([]);
        }
        return info;
      }).catch(() => { if (tokenCard) tokenCard.remove(); return null; });
  } else {
    window.currentOfficialTweetsPromise = Promise.resolve([]);
  }

  // Wait for token details and main search
  const [info, mainTweets] = await Promise.all([
    tokenFetchTask,
    window.mainSearchPromise
  ]);

  // Now that token info is fetched, we wait for official tweets if they started
  const officialTweets = await (window.currentOfficialTweetsPromise || Promise.resolve([]));

  // Extract exact fields required by the large model
  const mapTweetForAI = (t) => ({
    text: t.text,
    author: t.author,           // Supplement: author nickname
    username: t.screenName,     // Supplement: corresponding to backend username (Twitter handle)
    createdAt: t.createdAt,     // Supplement: tweet publication time
    likes: t.likes,
    retweets: t.retweets
  });

  const optimizedTweets = officialTweets.map(mapTweetForAI);
  const optimizedSearchResults = mainTweets.map(mapTweetForAI);

  const firstOfficialTweet = officialTweets[0];
  const userInfoObj = info ? {
    username: info.twitterLink?.split('/').pop() || (firstOfficialTweet ? firstOfficialTweet.screenName : ''),
    name: (firstOfficialTweet && firstOfficialTweet.author) ? firstOfficialTweet.author : info.name,
    biography: (firstOfficialTweet && firstOfficialTweet.description && firstOfficialTweet.description !== 'undefined') ? firstOfficialTweet.description : info.description
  } : null;
  const tokenDescObj = info ? I18N[currentLang].tokenDesc(info.name, info.marketCap, info.description) : null;

  // Render export buttons
  const payload = {
    searchResults: optimizedSearchResults,
    address: query,
    userInfo: userInfoObj,
    "user tweets": optimizedTweets,
    tokenDescription: tokenDescObj,
    language: currentLang
  };
  const actionsContainer = document.createElement('div');
  actionsContainer.style.cssText = `display: flex; gap: 6px; margin: 4px 16px; flex-wrap: nowrap;`;

  const btnStyle = (color) => `flex: 1; min-width: 0; padding: 6px 2px; background: ${color}15; border: 1px dashed ${color}; border-radius: 8px; color: ${color}; font-size: 11px; text-align: center; cursor: pointer; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;

  const exportBtn = document.createElement('div');
  exportBtn.style.cssText = btnStyle('var(--text-secondary)');
  exportBtn.textContent = `📥 JSON`;
  exportBtn.onclick = () => exportToTxt(payload, `token_${query}_export.txt`);

  const geminiBtn = document.createElement('div');
  geminiBtn.style.cssText = btnStyle('#1d9bf0');
  geminiBtn.textContent = `✨ Gemini`;
  geminiBtn.onclick = () => openOrFocusAI(payload, 'gemini');

  const gptBtn = document.createElement('div');
  gptBtn.style.cssText = btnStyle('#10a37f');
  gptBtn.textContent = `🤖 GPT`;
  gptBtn.onclick = () => openOrFocusAI(payload, 'chatgpt');

  const claudeBtn = document.createElement('div');
  claudeBtn.style.cssText = btnStyle('#d97757');
  claudeBtn.textContent = `🧠 Claude`;
  claudeBtn.onclick = () => openOrFocusAI(payload, 'claude');

  actionsContainer.appendChild(exportBtn);
  actionsContainer.appendChild(geminiBtn);
  actionsContainer.appendChild(gptBtn);
  actionsContainer.appendChild(claudeBtn);
  analysisWrapper.insertBefore(actionsContainer, summaryBox);

  // ================= REPLACEMENT START =================
  try {
    // Initialize empty analysis UI container
    renderAiAnalysisUI(summaryBox, { result: '' });
    const contentDiv = summaryBox.querySelector('#ai-analysis-content');
    let accumulatedText = '';

    // Establish an independent message listener to receive stream
    const aiStreamListener = (msg) => {
      // Add fault-tolerant matching: ensure addresses match (case-insensitive and trimmed)
      const targetAddress = String(query).toLowerCase().trim();
      const incomingAddress = String(msg.address || '').toLowerCase().trim();
      
      if (incomingAddress !== targetAddress) return; 

      if (msg.type === 'AI_ANALYZE_CHUNK') {
        accumulatedText += (msg.data || '');
        // Filter and update DOM in real-time to render typewriter effect
        const cleaned = accumulatedText
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/^#{1,6}\s*/gm, '');
          
        if (contentDiv && cleaned) {
          contentDiv.innerHTML = cleaned;
        }
      }
      else if (msg.type === 'AI_ANALYZE_DONE') {
        // 【Fallback】If accumulatedText is still empty on completion, use the full result
        if (!accumulatedText && msg.data && msg.data.result) {
           const finalCleaned = msg.data.result
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/^#{1,6}\s*/gm, '');
           if (contentDiv) contentDiv.innerHTML = finalCleaned;
        }
        chrome.runtime.onMessage.removeListener(aiStreamListener); // Release listener
      }
      else if (msg.type === 'AI_ANALYZE_ERROR') {
        chrome.runtime.onMessage.removeListener(aiStreamListener); // Release listener
        summaryBox.innerHTML = `<div style="color:var(--text-secondary);font-size:13px;">${I18N[currentLang].analysisFailed || 'Analysis Failed'}</div>`;
      }
    };

    // Mount listener
    chrome.runtime.onMessage.addListener(aiStreamListener);

    // Trigger background send, no longer await, entirely delegate to Listener to handle output stream
    chrome.runtime.sendMessage({
      type: 'AI_ANALYZE',
      payload: {
        tweets: cleanData(optimizedTweets),
        searchResults: cleanData(optimizedSearchResults),
        address: query,
        userInfo: cleanData(userInfoObj),
        tokenDescription: cleanData(tokenDescObj),
        forceUpdate: false,
        language: currentLang
      }
    });

  } catch (e) {
    summaryBox.innerHTML = `<div style="color:var(--text-secondary);font-size:13px;">${I18N[currentLang].aiConnError}</div>`;
  }
  // ================= REPLACEMENT END =================
}

// Helper rendering: Token card and interaction
function renderTokenCardUI(container, info) {
  const betterIcons = {
    x: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    tg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    web: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  };

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${info.avatar || DEFAULT_AVATAR}" style="width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--border-color);">
        <div>
          <div style="font-weight: 800; font-size: 16px; color:var(--text-primary);">${escapeHtml(info.name)}</div>
          <div style="color: #00ba7c; font-size: 13px; font-weight: bold;">MC: ${info.marketCap || 'Unknown'}</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        ${info.twitterLink ? `<div class="token-action-btn" id="token-x-btn" title="${I18N[currentLang].viewOfficial}" style="cursor: pointer;">${betterIcons.x}</div>` : ''}
        ${info.telegramLink ? `<a href="${info.telegramLink}" target="_blank" class="token-action-btn" style="cursor: pointer;">${betterIcons.tg}</a>` : ''}
        ${info.websiteLink ? `<a href="${info.websiteLink}" target="_blank" class="token-action-btn" style="cursor: pointer;">${betterIcons.web}</a>` : ''}
      </div>
    </div>
    ${info.description ? `<div style="font-size: 13px; line-height: 1.5; color: var(--text-secondary); max-height: 60px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${escapeHtml(info.description)}</div>` : ''}
  `;

  const xBtn = container.querySelector('#token-x-btn');
  if (xBtn) {
    xBtn.addEventListener('click', async () => {
      // Dynamically create a modal for official token tweets
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      modalZIndex += 10;
      overlay.style.zIndex = modalZIndex;
      overlay.style.display = 'flex';

      const handle = info.twitterLink.split('/').pop();
      overlay.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">${(I18N[currentLang].officialTweets) ? I18N[currentLang].officialTweets(handle) : `@${handle} Tweets`}</span>
            <div class="modal-close" style="cursor: pointer; width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;">✕</div>
          </div>
          <div class="modal-body" style="flex: 1; overflow-y: auto; padding-bottom: 20px;"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      const modalBody = overlay.querySelector('.modal-body');
      overlay.querySelector('.modal-close').addEventListener('click', () => {
        overlay.remove();
        modalZIndex -= 10;
      });

      // Temporary loading UI
      modalBody.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
           <svg class="spin-anim" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block; margin: 0 auto 10px auto;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
           <div style="margin-top: 10px;">${I18N[currentLang].loading || 'Loading...'}</div>
        </div>
      `;

      // Wait for official tweets if the fetch is still pending
      let tweets = window.currentOfficialTweetsPromise ? await window.currentOfficialTweetsPromise : currentOfficialTweets;
      tweets = tweets || [];

      let profileHtml = '';
      const firstTweet = tweets.length > 0 ? tweets[0] : null;
      const screenName = handle;

      // Construct a reliable header fallback
      profileHtml = `
        <div style="padding: 16px; border-bottom: 1px solid var(--border-color); background-color: rgba(29, 155, 240, 0.05);">
          <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 12px;">
            <img src="${firstTweet?.profileImageUrl || info.avatar || DEFAULT_AVATAR}" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--bg-primary);">
            <div style="flex: 1;">
              <div style="font-weight: 800; font-size: 18px; color: var(--text-primary); margin-bottom: 2px;">${escapeHtml(firstTweet?.author || handle)}</div>
              <div style="color: var(--text-secondary); font-size: 15px;">@${screenName}</div>
            </div>
            <a href="https://x.com/${screenName}" target="_blank" title="Open in X" style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--text-primary); color: var(--bg-primary); text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
          ${(firstTweet?.description && firstTweet?.description !== 'undefined') || info.description ? `<div style="font-size: 14px; line-height: 1.5; color: var(--text-primary); margin-bottom: 10px;">${escapeHtml((firstTweet?.description !== 'undefined' ? firstTweet?.description : null) || info.description)}</div>` : ''}
          ${firstTweet ? `<div style="display: flex; gap: 16px; font-size: 14px;">
            <div class="stat-clickable" data-userid="${firstTweet.userId || ''}" data-type="following" style="cursor: pointer;">
              <span style="color: var(--text-primary); font-weight: 700;">${formatNumber(firstTweet.followingCount)}</span> <span style="color: var(--text-secondary);">${I18N[currentLang].following || 'Following'}</span>
            </div>
            <div class="stat-clickable" data-userid="${firstTweet.userId || ''}" data-type="followers" style="cursor: pointer;">
              <span style="color: var(--text-primary); font-weight: 700;">${formatNumber(firstTweet.followersCount)}</span> <span style="color: var(--text-secondary);">${I18N[currentLang].followers || 'Followers'}</span>
            </div>
            ${firstTweet.location && firstTweet.location !== 'undefined' ? `<div style="color: var(--text-secondary);">📍 ${escapeHtml(firstTweet.location)}</div>` : ''}
          </div>` : ''}
        </div>
      `;

      modalBody.innerHTML = profileHtml + '<div id="modal-tweets-container-dynamic"></div>';

      const tweetsContainer = modalBody.querySelector('#modal-tweets-container-dynamic');
      if (tweets.length > 0) {
        renderTweets(tweets, tweetsContainer);
      } else {
        tweetsContainer.innerHTML = `<div class="empty" style="padding: 20px; text-align: center; color: var(--text-secondary);">${I18N[currentLang].noData || 'No recent tweets.'}</div>`;
      }
    });
  }
}

// Helper rendering: AI analysis results
function renderAiAnalysisUI(container, data) {
  const raw = data.result || data.chinese || data.english || '';
  // Strip markdown bold markers (**text** → text) and heading hashes (## text)
  const content = raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '');

  // Add Loading state HTML
  const loadingHtml = `<div class="ai-loading" style="display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 13px; padding: 4px 0;">
    <svg class="spin-anim" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    <span>${I18N[currentLang].loading}</span>
  </div>`;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div style="font-weight: 800; color: var(--accent-blue); display: flex; align-items: center; gap: 6px; font-size: 15px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        ${I18N[currentLang].deepNarrative}
      </div>
      <div id="ai-collapse-btn" style="cursor: pointer; padding: 4px; color: var(--text-secondary); display: flex; align-items: center; justify-content: center;">
        <svg id="ai-collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
      </div>
    </div>
    <div id="ai-analysis-content" style="white-space: pre-wrap; line-height: 1.6; text-align: justify; font-size: 14px; transition: max-height 0.4s ease, opacity 0.3s ease; overflow: hidden; opacity: 1; max-height: 9999px;">${content || loadingHtml}</div>
  `;

  const btn = container.querySelector('#ai-collapse-btn');
  const contentDiv = container.querySelector('#ai-analysis-content');
  const icon = container.querySelector('#ai-collapse-icon');
  let isCollapsed = false;

  btn.onclick = () => {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      // Fix: set explicit height before collapsing so CSS transition works
      contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
      requestAnimationFrame(() => {
        contentDiv.style.maxHeight = '0';
        contentDiv.style.opacity = '0';
      });
      icon.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
    } else {
      // Fix: use scrollHeight for dynamic real height, no truncation
      contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
      contentDiv.style.opacity = '1';
      icon.innerHTML = '<polyline points="18 15 12 9 6 15"></polyline>';
      // After transition ends, remove max-height limit to handle future reflows
      contentDiv.addEventListener('transitionend', () => {
        if (!isCollapsed) contentDiv.style.maxHeight = '9999px';
      }, { once: true });
    }
  };
}

// Also add a tiny rotation animation CSS for loading state
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } } .spin-anim { animation: spin 2s linear infinite; }`;
document.head.appendChild(style);

/*
// Popup result: AI personal deep profile analysis
async function generateUserProfileAnalysis(userData, tweets, container) {
  if (!tweets || tweets.length === 0 || !container) return;
  ...
}
*/

// Format HTML escaping
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === Added: Settings Panel Interaction Logic ===
const DEFAULT_MAX_TWEETS = 50;

const appLogo = document.querySelector('.app-logo');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const settingMaxTweetsInput = document.getElementById('setting-max-tweets');
const settingPromptInput = document.getElementById('setting-prompt');
const settingCustomAiEnabled = document.getElementById('setting-custom-ai-enabled');
const customAiFields = document.getElementById('custom-ai-fields');
const settingApiUrlInput = document.getElementById('setting-api-url');
const settingApiKeyInput = document.getElementById('setting-api-key');
const settingModelInput = document.getElementById('setting-model');
const settingSaveBtn = document.getElementById('setting-save-btn');

// Make Logo cursor a pointer on hover
if (appLogo) appLogo.style.cursor = 'pointer';

// Toggle custom AI fields visibility
if (settingCustomAiEnabled) {
  settingCustomAiEnabled.addEventListener('change', (e) => {
    customAiFields.style.display = e.target.checked ? 'block' : 'none';
  });
}

// Global click delegation for presets
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (btn) {
    const presetId = btn.dataset.id;
    if (presetId && typeof AI_PRESETS !== 'undefined' && AI_PRESETS[presetId]) {
      const preset = AI_PRESETS[presetId];
      if (settingApiUrlInput) settingApiUrlInput.value = preset.apiUrl;
      if (settingModelInput) settingModelInput.value = preset.model;
    }
  }
});

// Build preset buttons dynamically from AI_PRESETS
function renderPresets() {
  const container = document.getElementById('preset-container');
  if (!container || typeof AI_PRESETS === 'undefined') return;

  container.innerHTML = '';
  Object.keys(AI_PRESETS).forEach(id => {
    const preset = AI_PRESETS[id];
    const btn = document.createElement('div');
    btn.className = 'preset-btn';
    btn.dataset.id = id;
    btn.title = preset.name;
    const shortName = preset.name.split(' ')[0]; // Use first word as button text
    btn.textContent = shortName;
    container.appendChild(btn);
  });
}

// Load current settings
function loadSettings() {
  renderPresets(); // Ensure buttons are rendered when opening settings
  chrome.storage.local.get({
    clawalpha_max_tweets: DEFAULT_MAX_TWEETS,
    clawalpha_prompt: I18N[currentLang].defaultAiPrompt,
    clawalpha_custom_ai_enabled: false,
    clawalpha_show_floating_btn: true,
    clawalpha_api_url: '',
    clawalpha_api_key: '',
    clawalpha_model: ''
  }, (items) => {
    settingMaxTweetsInput.value = items.clawalpha_max_tweets;
    settingPromptInput.value = items.clawalpha_prompt;
    settingCustomAiEnabled.checked = items.clawalpha_custom_ai_enabled;
    if (document.getElementById('setting-show-floating-btn')) {
      document.getElementById('setting-show-floating-btn').checked = items.clawalpha_show_floating_btn;
    }
    customAiFields.style.display = items.clawalpha_custom_ai_enabled ? 'block' : 'none';
    settingApiUrlInput.value = items.clawalpha_api_url;
    settingApiKeyInput.value = items.clawalpha_api_key;
    settingModelInput.value = items.clawalpha_model;
  });
}

// Click Logo to open settings
if (appLogo) {
  appLogo.addEventListener('click', () => {
    loadSettings();
    settingsModal.style.display = 'flex';
  });
}

// Close settings
if (settingsClose) {
  settingsClose.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
}

// Save settings
if (settingSaveBtn) {
  settingSaveBtn.addEventListener('click', () => {
    const newMaxTweets = parseInt(settingMaxTweetsInput.value) || DEFAULT_MAX_TWEETS;
    const newPrompt = settingPromptInput.value.trim();
    const isCustomAi = settingCustomAiEnabled.checked;
    const isShowFloatingBtn = document.getElementById('setting-show-floating-btn')?.checked ?? true;
    const apiUrl = settingApiUrlInput.value.trim();
    const apiKey = settingApiKeyInput.value.trim();
    const modelName = settingModelInput.value.trim();

    chrome.storage.local.set({
      clawalpha_max_tweets: newMaxTweets,
      clawalpha_prompt: newPrompt,
      clawalpha_custom_ai_enabled: isCustomAi,
      clawalpha_show_floating_btn: isShowFloatingBtn,
      clawalpha_api_url: apiUrl,
      clawalpha_api_key: apiKey,
      clawalpha_model: modelName
    }, () => {
      settingSaveBtn.textContent = I18N[currentLang].saveSuccess;
      setTimeout(() => {
        settingSaveBtn.textContent = I18N[currentLang].saveSettings;
        settingsModal.style.display = 'none';
      }, 1000);
    });
  });
}