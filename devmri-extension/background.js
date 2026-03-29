// DevMRI Extension — Background Service Worker
// Handles score caching & badge updates

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const API_BASE = 'https://devmri.vercel.app'; // Production URL

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_SCORE') {
    getCachedScore(msg.repo).then(sendResponse);
    return true; // async response
  }
  if (msg.type === 'CLEAR_CACHE') {
    chrome.storage.local.remove(`score_${msg.repo}`, () => sendResponse({ ok: true }));
    return true;
  }
});

async function getCachedScore(repo) {
  return new Promise((resolve) => {
    const key = `score_${repo}`;
    chrome.storage.local.get([key], async (result) => {
      const cached = result[key];
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        resolve({ ...cached.data, fromCache: true });
        return;
      }

      // Fetch fresh score
      try {
        const token = await getToken();
        const data = await fetchScore(repo, token);
        // Cache it
        chrome.storage.local.set({ [key]: { data, timestamp: Date.now() } });
        resolve({ ...data, fromCache: false });
      } catch (err) {
        // Return cached even if stale
        if (cached) {
          resolve({ ...cached.data, fromCache: true, stale: true });
        } else {
          resolve({ error: err.message });
        }
      }
    });
  });
}

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['github_token'], (result) => {
      resolve(result.github_token || '');
    });
  });
}

async function fetchScore(repo, token) {
  const url = `${API_BASE}/api/badge?repo=${repo}&format=json`;
  const headers = {};
  if (token) headers['Authorization'] = `token ${token}`;
  
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
