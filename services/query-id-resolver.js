// query-id-resolver.js

// Dynamically fetch Query ID (strictly following bird source implementation)
let cachedQueryIds = { followers: null, following: null, search: null };

// Corresponding to DISCOVERY_PAGES in bird source
const DISCOVERY_PAGES = [
  'https://x.com/?lang=en',
  'https://x.com/explore',
  'https://x.com/notifications',
  'https://x.com/settings/profile',
];

// Corresponding to BUNDLE_URL_REGEX in bird source (direct capture of twimg CDN links, not dependent on src="")
const BUNDLE_URL_REGEX = /https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:-legacy)?\/[A-Za-z0-9.-]+\.js/g;

// Corresponding to the 4 sets of extreme regex extraction schemes in bird source
const OPERATION_PATTERNS = [
  { regex: /e\.exports=\{queryId\s*:\s*["']([^"']+)["']\s*,\s*operationName\s*:\s*["']([^"']+)["']/g, operationGroup: 2, queryIdGroup: 1 },
  { regex: /e\.exports=\{operationName\s*:\s*["']([^"']+)["']\s*,\s*queryId\s*:\s*["']([^"']+)["']/g, operationGroup: 1, queryIdGroup: 2 },
  { regex: /operationName\s*[:=]\s*["']([^"']+)["'](.{0,4000}?)queryId\s*[:=]\s*["']([^"']+)["']/g, operationGroup: 1, queryIdGroup: 3 },
  { regex: /queryId\s*[:=]\s*["']([^"']+)["'](.{0,4000}?)operationName\s*[:=]\s*["']([^"']+)["']/g, operationGroup: 3, queryIdGroup: 1 },
];

async function getLatestQueryIds() {
  if (cachedQueryIds.followers && cachedQueryIds.following && cachedQueryIds.search) {
    return cachedQueryIds;
  }

  try {
    const bundles = new Set();

    // 1. Traverse all discovery pages to scrape JS bundle links across the web
    for (const page of DISCOVERY_PAGES) {
      try {
        const res = await fetch(page);
        const html = await res.text();
        let match;
        // Reset regex cursor
        BUNDLE_URL_REGEX.lastIndex = 0;
        while ((match = BUNDLE_URL_REGEX.exec(html)) !== null) {
          bundles.add(match[0]);
        }
      } catch (err) {
        // Ignore failures of individual pages
      }
    }

    const bundleUrls = Array.from(bundles);
    if (bundleUrls.length === 0) {
      throw new Error("Failed to find any JS bundles, X may have changed domains");
    }

    // 2. Traverse JS files, use 4 sets of regex for brute-force extraction
    for (const url of bundleUrls) {
      // If all are found, terminate early to save performance
      if (cachedQueryIds.followers && cachedQueryIds.following && cachedQueryIds.search) break;

      try {
        const jsRes = await fetch(url);
        const jsText = await jsRes.text();

        for (const pattern of OPERATION_PATTERNS) {
          pattern.regex.lastIndex = 0; // Must reset stateful regex
          let match;
          while ((match = pattern.regex.exec(jsText)) !== null) {
            const operationName = match[pattern.operationGroup];
            const queryId = match[pattern.queryIdGroup];

            if (!operationName || !queryId) continue;

            // Match Following
            if (operationName === 'Following' || operationName === 'UserFollowing') {
              cachedQueryIds.following = { id: queryId, name: operationName };
            }
            // Match Followers
            else if (operationName === 'Followers' || operationName === 'UserFollowers') {
              cachedQueryIds.followers = { id: queryId, name: operationName };
            }
            // Match Search
            else if (operationName === 'SearchTimeline') {
              cachedQueryIds.search = { id: queryId, name: operationName };
            }
          }
        }
      } catch (err) {
        // Ignore failures of individual JS files
      }
    }
    
    console.log("🕵️‍♂️ [bird] Dynamically extracted X GraphQL Query IDs:", cachedQueryIds);
    return cachedQueryIds;
  } catch (err) {
    console.error("Failed to dynamically fetch Query ID:", err);
    return null;
  }
}
