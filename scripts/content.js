// content.js

// 1. Create Floating Button
const floatingBtn = document.createElement('div');
floatingBtn.id = 'clawalpha-floating-btn';
// Insert the logo image from the extension, and set pointer-events: none to prevent drag artifacts
floatingBtn.innerHTML = `
  <img src="${chrome.runtime.getURL('assets/bg.png')}" alt="XScope" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; pointer-events: none;">
`;

// Set floating button styles
Object.assign(floatingBtn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '52px',
    height: '52px',
    backgroundColor: '#000',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'grab', // Default grab gesture
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    zIndex: '2147483647', // Ensure it's on the top layer
    border: '2px solid #1d9bf0',
    transition: 'transform 0.2s ease',
    userSelect: 'none'
});

// Add Hover animation
floatingBtn.onmouseover = () => {
    if (!isDragging) floatingBtn.style.transform = 'scale(1.1)';
};
floatingBtn.onmouseout = () => {
    if (!isDragging) floatingBtn.style.transform = 'scale(1)';
};

// 2. Create Iframe Container for the Interface
const iframeContainer = document.createElement('div');
iframeContainer.id = 'clawalpha-iframe-container';

// Set Iframe container style (hidden by default)
Object.assign(iframeContainer.style, {
    position: 'fixed',
    width: '380px',
    height: '600px',
    backgroundColor: '#000',
    borderRadius: '12px',
    boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
    zIndex: '2147483647',
    display: 'none',
    overflow: 'hidden',
    border: '1px solid #2f3336'
});

// 3. Embed sidepanel.html from the Extension
const iframe = document.createElement('iframe');
iframe.src = chrome.runtime.getURL('ui/sidepanel.html');
Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block'
});

// Add iframe to the container, and inject the container and button into the page body
iframeContainer.appendChild(iframe);
document.body.appendChild(floatingBtn);
document.body.appendChild(iframeContainer);

// 4. Dynamically Calculate Iframe Panel Position (Smart Avoidance)
function updateIframePosition(btnLeft, btnTop, btnWidth, btnHeight) {
    iframeContainer.style.bottom = 'auto';
    iframeContainer.style.right = 'auto';

    // Default try to place above the button
    let iframeTop = btnTop - 610;
    if (iframeTop < 0) {
        // If space above is not enough, place below the button
        iframeTop = btnTop + btnHeight + 10;
    }

    // Default try to align with the right edge of the button
    let iframeLeft = btnLeft + btnWidth - 380;
    if (iframeLeft < 0) {
        // If left side exceeds screen, align to left
        iframeLeft = 10;
    } else if (iframeLeft + 380 > window.innerWidth) {
        // Prevent right side from exceeding screen
        iframeLeft = window.innerWidth - 390;
    }

    iframeContainer.style.top = iframeTop + 'px';
    iframeContainer.style.left = iframeLeft + 'px';
}

// 5. Drag Logic and Click Event Handling
let isDragging = false;
let dragHasMoved = false; // Used to distinguish between "click" and "drag"
let startX, startY;

// Mouse down: prepare for dragging
floatingBtn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevent default behavior (avoid image ghosting during drag)
    isDragging = true;
    dragHasMoved = false;
    floatingBtn.style.cursor = 'grabbing';
    floatingBtn.style.transition = 'none'; // Cancel animation during drag to stay perfectly responsive

    startX = e.clientX;
    startY = e.clientY;

    // Use offsetLeft/offsetTop instead of getBoundingClientRect()
    // offsetLeft gets the real layout coordinates without transform scaling, preventing overflow offset on each click
    const currentLeft = floatingBtn.offsetLeft;
    const currentTop = floatingBtn.offsetTop;

    // Clear bottom and right positioning, convert fully to left and top control
    floatingBtn.style.bottom = 'auto';
    floatingBtn.style.right = 'auto';
    floatingBtn.style.left = currentLeft + 'px';
    floatingBtn.style.top = currentTop + 'px';
});

// Mouse move: execute dragging
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Set a debounce threshold (e.g., 3 pixels), exceeding it counts as a real drag, preventing accidental movement on click
    if (!dragHasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        dragHasMoved = true;
    }

    // Only update position when a real drag occurs
    if (dragHasMoved) {
        let newLeft = floatingBtn.offsetLeft + dx;
        let newTop = floatingBtn.offsetTop + dy;

        // Boundary check: prevent the button from being dragged outside the visible screen area
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - floatingBtn.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - floatingBtn.offsetHeight));

        floatingBtn.style.left = newLeft + 'px';
        floatingBtn.style.top = newTop + 'px';

        startX = e.clientX;
        startY = e.clientY;

        // If sidepanel is open during drag, let it follow the button
        if (iframeContainer.style.display !== 'none') {
            updateIframePosition(newLeft, newTop, floatingBtn.offsetWidth, floatingBtn.offsetHeight);
        }
    }
});

// Mouse up: end dragging
document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        floatingBtn.style.cursor = 'grab';
        floatingBtn.style.transition = 'transform 0.2s ease'; // Restore interaction animation
        // If mouse up and not on button, cancel scaling
        floatingBtn.style.transform = 'scale(1)';
    }
});

// Click button: toggle panel display/hidden
floatingBtn.addEventListener('click', (e) => {
    // If a drag occurred, determine it as drag end, don't trigger click to open panel
    if (dragHasMoved) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }

    if (iframeContainer.style.display === 'none') {
        // Before opening panel, re-calculate the popup position
        updateIframePosition(floatingBtn.offsetLeft, floatingBtn.offsetTop, floatingBtn.offsetWidth, floatingBtn.offsetHeight);
        iframeContainer.style.display = 'block';
    } else {
        iframeContainer.style.display = 'none';
    }
});

// A. Listen to messages from the webpage
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'CLAWALPHA_WEB') return;

    // New: TRIGGER_GLOBAL_SEARCH — direct keyword search, results streamed back to the page
    if (event.data.type === 'TRIGGER_SEARCH') {
        const query = event.data.query;
        const scope = event.data.scope || 'web';

        chrome.storage.local.get({
            clawalpha_max_tweets: 50,
            clawalpha_search_type: 'Latest'
        }, (items) => {
            chrome.runtime.sendMessage({
                type: 'SEARCH',
                query: query,
                product: event.data.product || items.clawalpha_search_type,
                scope: scope,
                maxTweets: event.data.maxTweets || items.clawalpha_max_tweets
            }).catch(() => { });
        });
    }

    // TRIGGER_TOKEN_INFO — fetch dexscreener info via background
    if (event.data.type === 'TRIGGER_TOKEN_INFO') {
        chrome.runtime.sendMessage({
            type: 'GET_TOKEN_INFO',
            address: event.data.address
        }).then(response => {
            window.postMessage({
                source: 'CLAWALPHA_EXT',
                type: 'TOKEN_INFO_RESULT',
                success: response.success,
                data: response.data,
                error: response.error
            }, '*');
        }).catch(err => {
            window.postMessage({
                source: 'CLAWALPHA_EXT',
                type: 'TOKEN_INFO_RESULT',
                success: false,
                error: err.message
            }, '*');
        });
    }

    // New: TRIGGER_AI_ANALYZE — forward AI analysis request to background
    if (event.data.type === 'TRIGGER_AI_ANALYZE') {
        chrome.runtime.sendMessage({
            type: 'AI_ANALYZE',
            payload: event.data.payload
        }).then(response => {
            window.postMessage({
                source: 'CLAWALPHA_EXT',
                type: 'AI_ANALYZE_RESULT',
                success: response.success,
                data: response.data,
                error: response.error
            }, '*');
        }).catch(err => {
            window.postMessage({
                source: 'CLAWALPHA_EXT',
                type: 'AI_ANALYZE_RESULT',
                success: false,
                error: err.message
            }, '*');
        });
    }

    // Legacy: TRIGGER_USER_PROFILE — open popup modal for a specific user
    if (event.data.type === 'TRIGGER_USER_PROFILE') {
        chrome.runtime.sendMessage({
            type: 'OPEN_USER_PROFILE',
            screenName: event.data.query
        });
    }
});

// B. Listen to messages from the plugin background and forward to the webpage for rendering
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SEARCH_CHUNK' || message.type === 'SEARCH_FINISHED' || message.type === 'SEARCH_ERROR') {
        window.postMessage({
            source: 'CLAWALPHA_EXT',
            ...message
        }, '*');
    }
});