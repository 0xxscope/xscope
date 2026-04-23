/**
 * Frontend implementation of the Token Information Service
 * Ported from backend tokenInfoService.js
 */

const TOKEN_SERVICE = (() => {
  const BASE_URL = 'https://api.dexscreener.com';
  const CHAIN_IDS = ['solana', 'ethereum', 'base', 'bsc'];
  const CHAIN_IDS2 = ['ethereum', 'base', 'bsc', 'solana'];

  function formatTimeAgo(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 0) return dateString;

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, seconds] of Object.entries(intervals)) {
      const value = Math.floor(diffInSeconds / seconds);
      if (value >= 1) {
        return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
      }
    }
    return 'just now';
  }

  function formatMarketCap(value) {
    if (!value) return null;
    const num = typeof value === 'string' ?
      parseFloat(value.replace(/[^0-9.-]+/g, "")) :
      value;

    if (isNaN(num)) return null;

    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  }

  async function getTokenInfo(address) {
    try {
      const searchChains = address.startsWith('0x') ? CHAIN_IDS2 : CHAIN_IDS;
      let dexData = null;

      for (const chainId of searchChains) {
        try {
          const res = await fetch(`${BASE_URL}/tokens/v1/${chainId}/${address}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            dexData = data[0];
            break;
          }
        } catch (error) {
          console.warn(`Fetch on ${chainId} failed:`, error.message);
          continue;
        }
      }

      if (!dexData) return null;

      let websiteLink = null;
      let twitterLink = null;
      let telegramLink = null;

      if (dexData.info) {
        if (dexData.info.websites && dexData.info.websites.length > 0) {
          websiteLink = dexData.info.websites[0].url;
        }
        if (dexData.info.socials) {
          dexData.info.socials.forEach(social => {
            if (social.type === 'twitter') twitterLink = social.url;
            if (social.type === 'telegram') telegramLink = social.url;
          });
        }
      }

      const name = dexData.baseToken?.name || null;
      const symbol = dexData.baseToken?.symbol || '';
      const displayName = symbol ? `${name} (${symbol})` : name;

      return {
        chainId: dexData.chainId || CHAIN_IDS[0],
        name: displayName,
        avatar: dexData.info?.imageUrl || null,
        description: dexData.info?.description || null,
        createdAt: formatTimeAgo(dexData.pairCreatedAt ? new Date(dexData.pairCreatedAt).toISOString() : null),
        marketCap: formatMarketCap(dexData.marketCap || null),
        volume: formatMarketCap(dexData.volume?.h24 || null),
        price: dexData.priceUsd || null,
        priceChange: {
          h1: dexData.priceChange?.h1 || null,
          h24: dexData.priceChange?.h24 || null
        },
        liquidity: formatMarketCap(dexData.liquidity?.usd || null),
        twitterLink: twitterLink || null,
        websiteLink: websiteLink || null,
        telegramLink: telegramLink || null
      };

    } catch (error) {
      console.error('Error fetching token info frontend:', error.message);
      return null;
    }
  }

  return {
    getTokenInfo,
    formatMarketCap,
    formatTimeAgo
  };
})();
