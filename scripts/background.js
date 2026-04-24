// background.js
importScripts('../services/query-id-resolver.js');
importScripts('../services/token-service.js');
importScripts('../services/ai-presets.js');
importScripts('../services/ai-service.js');
// Target tweet count to fetch
// const TARGET_TWEET_COUNT = 50; 
const MAX_REQUESTS = 10;

// Query ID list
const QUERY_IDS = [
  'M1jEez78PEfVfbQLvlWMvQ',
  '6AAys3t42mosm_yTI_QENg'
];

const BEARER_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// Features (from bird source)
const SEARCH_FEATURES = {
  "rweb_video_screen_enabled": true,
  "profile_label_improvements_pcf_label_in_post_enabled": true,
  "responsive_web_profile_redirect_enabled": true,
  "rweb_tipjar_consumption_enabled": true,
  "verified_phone_label_enabled": false,
  "creator_subscriptions_tweet_preview_api_enabled": true,
  "responsive_web_graphql_timeline_navigation_enabled": true,
  "responsive_web_graphql_exclude_directive_enabled": true,
  "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
  "premium_content_api_read_enabled": false,
  "communities_web_enable_tweet_community_results_fetch": true,
  "c9s_tweet_anatomy_moderator_badge_enabled": true,
  "responsive_web_grok_analyze_button_fetch_trends_enabled": false,
  "responsive_web_grok_analyze_post_followups_enabled": false,
  "responsive_web_grok_annotations_enabled": false,
  "responsive_web_jetfuel_frame": true,
  "post_ctas_fetch_enabled": true,
  "responsive_web_grok_share_attachment_enabled": true,
  "responsive_web_edit_tweet_api_enabled": true,
  "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
  "view_counts_everywhere_api_enabled": true,
  "longform_notetweets_consumption_enabled": true,
  "responsive_web_twitter_article_tweet_consumption_enabled": true,
  "tweet_awards_web_tipping_enabled": false,
  "responsive_web_grok_show_grok_translated_post": false,
  "responsive_web_grok_analysis_button_from_backend": true,
  "creator_subscriptions_quote_tweet_preview_enabled": false,
  "freedom_of_speech_not_reach_fetch_enabled": true,
  "standardized_nudges_misinfo": true,
  "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": true,
  "rweb_video_timestamps_enabled": true,
  "longform_notetweets_rich_text_read_enabled": true,
  "longform_notetweets_inline_media_enabled": true,
  "responsive_web_grok_image_annotation_enabled": true,
  "responsive_web_grok_imagine_annotation_enabled": true,
  "responsive_web_grok_community_note_auto_translation_is_enabled": false,
  "articles_preview_enabled": true,
  "responsive_web_enhance_cards_enabled": false
};

function getUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
const CLIENT_UUID = getUuid();
const DEVICE_ID = getUuid();

// Context menu logic
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'openSidePanel',
      title: 'Open X Search Sidepanel',
      contexts: ['all']
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openSidePanel') {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});


chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });


// 1. Global search ID, ensuring only one search task runs at a time (whether in the main interface or popup)
// 1. Global search ID, records isolated by scope, ensuring main and silent can run in parallel
let activeSearchIds = {
  main: null,
  modal: null,
  silent: null // Used for silent loading of official tweets
};
let lastSearchData = []; // 👈 Used to save the tweet results of the most recent search

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEARCH') {
    const scope = request.scope || 'main';
    const searchId = Date.now().toString();
    activeSearchIds[scope] = searchId;

    let product = request.product || "Latest";

    if (scope.startsWith('modal') || scope === 'silent') {
      product = "Latest";
    }

    // Extract maxTweets parameter, default to 50 if not provided
    const maxTweets = request.maxTweets || 50;

    // Add extra maxTweets parameter
    autoLoopSearch(request.query, product, searchId, scope, maxTweets).then(sendResponse);
    return true;
  }

  // 👇 New listener for fetching user lists
  if (request.type === 'FETCH_USERS') {
    fetchUserRelationList(request.userId, request.relationType, request.cursor).then(sendResponse);
    return true;
  }

  // 👇 New listener for fetching the most recent search data (for profile analysis)
  if (request.type === 'GET_LAST_SEARCH_DATA') {
    sendResponse({ success: true, data: lastSearchData });
    return false;
  }

  // 👇 New listener for fetching token info (DexScreener)
  if (request.type === 'GET_TOKEN_INFO') {
    TOKEN_SERVICE.getTokenInfo(request.address).then(info => {
      sendResponse({ success: true, data: info });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (request.type === 'AI_ANALYZE') {
    const targetAddr = request.payload.address;
    sendResponse({ success: true, started: true });  // Send ack first
    
    setTimeout(() => {  // Delay 50ms to allow frontend listener to mount
      chrome.storage.local.get({ clawalpha_lang: 'en' }, (items) => {
        const payload = { ...request.payload };
        if (!payload.language) payload.language = items.clawalpha_lang;

        // Call service, passing in onChunk push function
        AI_SERVICE.handleAiAnalyzeRequest(payload, (chunkText) => {
          chrome.runtime.sendMessage({
            type: 'AI_ANALYZE_CHUNK',
            address: targetAddr,
            data: chunkText
          }).catch(err => console.warn('[AI_ANALYZE] send failed:', err));
        }).then(data => {
          // Broadcast on completion
          chrome.runtime.sendMessage({
            type: 'AI_ANALYZE_DONE',
            address: targetAddr,
            data: data
          }).catch(err => console.warn('[AI_ANALYZE] send failed:', err));
        }).catch(err => {
          // Broadcast on error
          chrome.runtime.sendMessage({
            type: 'AI_ANALYZE_ERROR',
            address: targetAddr,
            error: err.message
          }).catch(err => console.warn('[AI_ANALYZE] send failed:', err));
        });
      });
    }, 50);

    return false;
  }
});

async function getCookies() {
  const ct0 = await chrome.cookies.get({ url: "https://x.com", name: "ct0" });
  if (!ct0) throw new Error("Please login to X.com first");
  return ct0.value;
}

// Auto loop search
// 👇 Added third parameter searchId, fourth parameter scope, fifth parameter maxTweets
async function autoLoopSearch(query, product, searchId, scope, maxTweets) {
  let allTweets = [];
  let nextCursor = null;
  let requestCount = 0;

  while (allTweets.length < maxTweets && requestCount < MAX_REQUESTS) {
    // 👇 [Core Fix]: Only check if the current scope's ID has changed, ensuring main and silent tasks can run completely in parallel
    if (activeSearchIds[scope] !== searchId) {
      console.log(`[Abort] New task detected in scope ${scope}, old search silently aborted.`);
      return { success: false, error: `Aborted by new search in scope ${scope}` };
    }

    try {
      requestCount++;
      console.log(`[Loop] Page ${requestCount} fetching (${product})...`);

      const result = await performSingleRequestWithFallback(query, nextCursor, product);

      if (!result.success) {
        console.error("Request failed:", result.error);

        // 👇 NEW: If no data is fetched and an error occurs (e.g., not logged in), return the error to the frontend directly
        if (allTweets.length === 0) {
          return { success: false, error: result.error };
        }
        break; // If some data has already been obtained before the error, stop fetching and return existing data
      }

      const { tweets, cursor } = result.data;
      console.log(`[Loop] Found ${tweets.length} tweets. Cursor: ${cursor ? 'Yes' : 'No'}`);

      // 👇 [Optimization 1]: Regardless of the page number, if the number of tweets is 0, it means the end has been reached, stop immediately!
      if (tweets.length === 0) {
        console.log(`No data fetched on page ${requestCount}, search ended early.`);
        break;
      }

      // Deduplicate
      const existingIds = new Set(allTweets.map(t => t.id));
      const newTweets = tweets.filter(t => !existingIds.has(t.id));

      // 👇 [Optimization 2]: If the interface returns tweets but they are all duplicates, it also means the end has been reached, stop immediately!
      if (newTweets.length === 0 && requestCount > 1) {
        console.log(`Page ${requestCount} contains only duplicate data, search ended early.`);
        break;
      }

      // Add deduplicated tweets to the total list
      allTweets = [...allTweets, ...newTweets];

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SEARCH_CHUNK',
            data: newTweets,
            totalCount: allTweets.length,
            scope: scope
          }).catch(() => { }); // Ignore pages where scripts are not injected
        }
      });

      // 👇 Include scope when sending messages to inform the frontend which container to fill with data
      chrome.runtime.sendMessage({
        type: 'SEARCH_CHUNK',
        data: newTweets,
        totalCount: allTweets.length,
        scope: scope
      }).catch(() => { }); // Catch and ignore errors when the panel might have been closed

      if (!cursor) break;

      nextCursor = cursor;
      await new Promise(r => setTimeout(r, 600));

    } catch (err) {
      console.error("Loop error", err);
      break;
    }
  }

  // Save the deduplicated total list globally for subsequent profile analysis retrieval
  lastSearchData = allTweets;

  // Notify tabs that search is finished
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'SEARCH_FINISHED',
        data: allTweets,
        totalCount: allTweets.length,
        scope: scope
      }).catch(() => { });
    }
  });

  // Also notify runtime (sidepanel/popup)
  chrome.runtime.sendMessage({
    type: 'SEARCH_FINISHED',
    data: allTweets,
    totalCount: allTweets.length,
    scope: scope
  }).catch(() => { });

  return { success: true, data: allTweets };
}

async function performSingleRequestWithFallback(query, cursor, product) {
  let lastError = null;

  // 1. First, quickly try the hardcoded fallbacks (instant response)
  for (const id of QUERY_IDS) {
    const result = await performRequest(query, id, cursor, product);
    if (result.success) return result;

    if (result.error.includes("400") || result.error.includes("404")) {
      lastError = result.error;
      continue;
    }
    return result; // Error out early if it's a rate limit or actual network issue
  }

  // 2. 🛡 EMERGENCY FALLBACK: Only fetch from JS bundles if ALL hardcoded IDs fail (avoid 3s delay)
  console.log("⚠️ [bird] Hardcoded Query IDs expired! Falling back to dynamic extraction...");
  const queryIds = await getLatestQueryIds();
  const dynamicSearchId = queryIds?.search?.id;

  if (dynamicSearchId && !QUERY_IDS.includes(dynamicSearchId)) {
    console.log("🕵️‍♂️ Retry searching using dynamically fetched ID:", dynamicSearchId);
    const result = await performRequest(query, dynamicSearchId, cursor, product);
    if (result.success) return result;
    lastError = result.error || lastError;
  }

  return { success: false, error: lastError };
}

async function performRequest(query, queryId, cursor, product) {
  try {
    const ct0 = await getCookies();

    const variables = {
      rawQuery: query,
      count: 20,
      querySource: "typed_query",
      product: product
    };

    if (cursor) {
      variables.cursor = cursor;
    }

    const urlParams = new URLSearchParams({ variables: JSON.stringify(variables) });
    const url = `https://x.com/i/api/graphql/${queryId}/SearchTimeline?${urlParams.toString()}`;

    const bodyPayload = {
      features: SEARCH_FEATURES,
      queryId: queryId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': BEARER_TOKEN,
        'x-csrf-token': ct0,
        'x-client-uuid': CLIENT_UUID,
        'x-twitter-client-deviceid': DEVICE_ID,
        'content-type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    if (data.errors && data.errors.length > 0) return { success: false, error: data.errors[0].message };

    const resultData = parseResponse(data);
    return { success: true, data: resultData };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

function parseResponse(data) {
  const instructions = data.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || [];
  const tweets = [];
  let nextCursor = null;

  for (const instruction of instructions) {
    if (instruction.type === 'TimelineAddEntries' || instruction.entries) {
      for (const entry of instruction.entries || []) {

        const tweetResult = entry.content?.itemContent?.tweet_results?.result ||
          entry.item?.itemContent?.tweet_results?.result;

        if (tweetResult) {
          const mappedTweet = mapTweet(tweetResult);
          if (mappedTweet) {
            tweets.push(mappedTweet);
          }
        }

        if (isBottomCursor(entry)) nextCursor = getCursorValue(entry);
      }
    }

    if (instruction.type === 'TimelineReplaceEntry') {
      const entry = instruction.entry;
      if (entry && isBottomCursor(entry)) nextCursor = getCursorValue(entry);
    }
  }

  return { tweets, cursor: nextCursor };
}

function mapTweet(result) {
  if (!result) return null;

  const tweet = result.tweet || result;

  if (!tweet.legacy) return null;

  const userResultWrapper = tweet.core?.user_results?.result;
  if (!userResultWrapper) return null;

  const user = userResultWrapper.user || userResultWrapper;

  const legacy = user.legacy;
  const core = user.core;

  const screenName = legacy?.screen_name || core?.screen_name;
  const name = legacy?.name || core?.name || screenName;
  const profileImageUrl = legacy?.profile_image_url_https || user.avatar?.image_url;

  if (!screenName) return null;

  return {
    id: tweet.legacy.id_str,
    text: tweet.legacy.full_text,
    createdAt: tweet.legacy.created_at,
    likes: tweet.legacy.favorite_count,
    retweets: tweet.legacy.retweet_count,
    author: name,
    screenName: screenName,
    profileImageUrl: profileImageUrl,

    // 👇 New: getting the numeric ID
    userId: user.rest_id,

    // 👇 New: extracting user profile data
    description: legacy?.description || '',
    followersCount: legacy?.followers_count || 0,
    followingCount: legacy?.friends_count || 0,
    location: legacy?.location || ''
  };
}

function isBottomCursor(entry) {
  if (entry.content?.entryType === 'TimelineTimelineCursor' && entry.content.cursorType === 'Bottom') return true;
  if (entry.entryId && entry.entryId.startsWith('cursor-bottom-')) return true;
  return false;
}

function getCursorValue(entry) {
  if (entry.content?.value) return entry.content.value;
  if (entry.content?.itemContent?.value) return entry.content.itemContent.value;
  return null;
}

// Fetch following/follower list (using v1.1 REST interface from bird source, perfectly bypassing GraphQL's 404 limit)
async function fetchUserRelationList(userId, relationType, cursor) {
  try {
    const ct0_cookie = await chrome.cookies.get({ url: "https://x.com", name: "ct0" });
    if (!ct0_cookie) throw new Error("Please login to X.com first");
    const ct0 = ct0_cookie.value;

    // Legacy v1.1 interface paths: followers is followers/list.json, following is friends/list.json
    const endpoint = relationType === 'followers' ? 'followers/list.json' : 'friends/list.json';

    // Construct minimal parameters
    const params = new URLSearchParams({
      user_id: userId,
      count: 20,
      skip_status: 'true',
      include_user_entities: 'false'
    });

    if (cursor) {
      params.set('cursor', cursor);
    }

    const url = `https://x.com/i/api/1.1/${endpoint}?${params.toString()}`;

    // Initiate GET request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'authorization': BEARER_TOKEN,
        'x-csrf-token': ct0,
        'content-type': 'application/json',
        // Add these two headers to impersonate an official web client session
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes'
      }
    });

    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();

    const users = [];
    // The pagination cursor field for the v1.1 interface is called next_cursor_str
    let nextCursor = data.next_cursor_str && data.next_cursor_str !== '0' ? data.next_cursor_str : null;

    // The user array returned by the v1.1 interface is very flat, just traverse it directly
    if (data.users && Array.isArray(data.users)) {
      data.users.forEach(u => {
        users.push({
          id: u.id_str || String(u.id),
          name: u.name || u.screen_name,
          screenName: u.screen_name,
          avatar: u.profile_image_url_https || '',
          desc: u.description || '',
          followersCount: u.followers_count || 0,
          followingCount: u.friends_count || 0
        });
      });
    }

    return { success: true, data: { users, cursor: nextCursor } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
