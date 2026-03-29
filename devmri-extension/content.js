// DevMRI Extension — Content Script
// Injects DX Score badge + sidebar panel directly onto GitHub repository pages

(function() {
  'use strict';
  
  const API_BASE = 'https://devmri.vercel.app';
  const COLORS = { A: '#00e676', B: '#00e5ff', C: '#ffab00', D: '#ff6d00', F: '#ff1744' };
  
  function getColor(score) {
    if (score >= 90) return '#00e676';
    if (score >= 75) return '#00e5ff';
    if (score >= 60) return '#ffab00';
    if (score >= 40) return '#ff6d00';
    return '#ff1744';
  }

  function getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  function createInlineBadge(data) {
    const score = data.score || data.dxScore || 0;
    const grade = data.grade || getGrade(score);
    const color = getColor(score);
    const repo = data.repo || '';
    
    const badge = document.createElement('a');
    badge.className = 'devmri-badge';
    badge.href = `${API_BASE}/dashboard?repo=${repo}`;
    badge.target = '_blank';
    badge.title = `DevMRI DX Score: ${score}/100 (Grade ${grade}) — Click for full diagnostic`;
    
    badge.innerHTML = `
      <div class="devmri-badge-inner">
        <span class="devmri-badge-icon">🩻</span>
        <span class="devmri-badge-label">DX</span>
        <span class="devmri-badge-score" style="color: ${color};">${score}</span>
        <span class="devmri-badge-grade" style="background: ${color}18; color: ${color}; border-color: ${color}40;">${grade}</span>
      </div>
    `;
    
    return badge;
  }

  function createSidebarWidget(data) {
    const score = data.score || data.dxScore || 0;
    const grade = data.grade || getGrade(score);
    const color = getColor(score);
    const repo = data.repo || '';
    const cost = data.frictionCost || data.friction_cost;
    const costValue = typeof cost === 'object' ? cost.total : (cost || 0);

    const widget = document.createElement('div');
    widget.className = 'devmri-sidebar-widget';
    widget.innerHTML = `
      <div class="devmri-widget-header">
        <span class="devmri-widget-logo">🩻</span>
        <span class="devmri-widget-title">DevMRI</span>
      </div>
      <div class="devmri-widget-body">
        <div class="devmri-widget-score-row">
          <div class="devmri-widget-score" style="color: ${color};">${score}</div>
          <div class="devmri-widget-meta">
            <span class="devmri-widget-grade" style="background: ${color}18; color: ${color}; border-color: ${color}40;">Grade ${grade}</span>
            <span class="devmri-widget-label">DX Score</span>
          </div>
        </div>
        <div class="devmri-widget-bar">
          <div class="devmri-widget-bar-fill" style="width: ${score}%; background: ${color};"></div>
        </div>
        ${costValue > 0 ? `
          <div class="devmri-widget-cost">
            <span class="devmri-widget-cost-label">Friction</span>
            <span class="devmri-widget-cost-value">$${costValue.toLocaleString()}/mo</span>
          </div>
        ` : ''}
        <a href="${API_BASE}/dashboard?repo=${repo}" target="_blank" class="devmri-widget-link">
          View Full X-Ray →
        </a>
      </div>
    `;
    
    return widget;
  }

  async function injectBadge() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) return;
    
    const owner = pathParts[0];
    const repoName = pathParts[1].replace('.git', '');
    const repoPath = `${owner}/${repoName}`;
    
    // Ignore non-repo pages
    const ignore = ['settings', 'pulls', 'issues', 'marketplace', 'explore', 'notifications', 'organizations', 'orgs', 'topics', 'trending', 'collections', 'sponsors', 'login', 'signup', 'new'];
    if (ignore.includes(owner)) return;

    // Remove existing badges
    document.querySelectorAll('.devmri-badge, .devmri-sidebar-widget').forEach(el => el.remove());

    try {
      // Try background cache first
      let data;
      try {
        data = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'GET_SCORE', repo: repoPath }, (response) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else if (!response || response.error) reject(new Error(response?.error || 'No data'));
            else resolve(response);
          });
        });
      } catch {
        // Fallback: direct API
        const response = await fetch(`${API_BASE}/api/badge?repo=${repoPath}&format=json`);
        if (!response.ok) return;
        data = await response.json();
      }

      data.repo = repoPath;

      // 1. Inject inline badge near repo title
      const repoTitle = document.querySelector('[itemprop="name"]') ||
                        document.querySelector('strong.mr-2.flex-self-stretch a') ||
                        document.querySelector('.AppHeader-context-item-label');
      
      if (repoTitle) {
        const badge = createInlineBadge(data);
        const parent = repoTitle.closest('div') || repoTitle.parentElement;
        if (parent && !parent.querySelector('.devmri-badge')) {
          parent.appendChild(badge);
        }
      }

      // 2. Inject sidebar widget
      const sidebar = document.querySelector('.BorderGrid--spacious') ||
                      document.querySelector('.Layout-sidebar') ||
                      document.querySelector('[class*="sidebar"]');
      
      if (sidebar && !sidebar.querySelector('.devmri-sidebar-widget')) {
        const widget = createSidebarWidget(data);
        sidebar.prepend(widget);
      }

    } catch (err) {
      // Silent fail — extension should never break GitHub
      console.debug('DevMRI:', err.message);
    }
  }

  // ═══════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════

  // Initial injection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectBadge, 500));
  } else {
    setTimeout(injectBadge, 500);
  }

  // Handle GitHub turbo/SPA navigation
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(injectBadge, 800);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Also listen for turbo:load events
  document.addEventListener('turbo:load', () => setTimeout(injectBadge, 500));

})();
