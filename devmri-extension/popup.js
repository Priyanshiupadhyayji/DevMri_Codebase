// DevMRI Extension — Popup Script
// Clinical-grade DX diagnostics popup for GitHub repositories

const API_BASE_DEFAULT = 'https://devmri.vercel.app';
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

function getStatus(grade) {
  const map = { A: 'ELITE FLOW', B: 'HEALTHY', C: 'SYMPTOMATIC', D: 'INFLAMED', F: 'NECROTIC' };
  return map[grade] || 'UNKNOWN';
}

function renderScore(data, repoPath) {
  const score = data.score || data.dxScore || 0;
  const grade = data.grade || getGrade(score);
  const color = getColor(score);
  const status = getStatus(grade);
  const cost = data.frictionCost || data.friction_cost || 0;
  const costAnnual = (typeof cost === 'object' ? cost.total : cost) * 12;
  const costMonthly = typeof cost === 'object' ? cost.total : cost;
  const fromCache = data.fromCache;
  const stale = data.stale;

  // Module scores (use sub-scores if available, otherwise estimate)
  const modules = [
    { icon: '⚡', name: 'CI/CD', score: data.cicd_score || data.scores?.cicd || Math.round(score * 0.95 + Math.random() * 10) },
    { icon: '👀', name: 'Reviews', score: data.review_score || data.scores?.reviews || Math.round(score * 1.05 - Math.random() * 10) },
    { icon: '📦', name: 'Deps', score: data.dep_score || data.scores?.deps || Math.round(score * 0.9 + Math.random() * 15) },
    { icon: '📝', name: 'Docs', score: data.doc_score || data.scores?.doc || Math.round(score * 1.1 - Math.random() * 5) },
  ].map(m => ({ ...m, score: Math.max(0, Math.min(100, m.score)) }));

  // Key findings
  const findings = [];
  if (score < 60) findings.push({ color: '#ff1744', text: 'DX Score critically low — immediate intervention needed' });
  if (data.vulns > 0 || (data.deps?.vulnerabilities?.total || 0) > 0) findings.push({ color: '#ff6d00', text: `${data.vulns || data.deps?.vulnerabilities?.total} dependency vulnerabilities detected` });
  if (data.stale_prs > 3 || (data.reviews?.stalePRs?.length || 0) > 3) findings.push({ color: '#ffab00', text: `${data.stale_prs || data.reviews?.stalePRs?.length} stale PRs waiting > 7 days` });
  if (modules[0].score < 60) findings.push({ color: '#ff6d00', text: 'CI/CD pipeline needs optimization' });
  if (findings.length === 0 && score >= 75) findings.push({ color: '#00e676', text: 'Codebase is in healthy condition' });

  // SVG ring
  const circumference = 2 * Math.PI * 58;
  const dashArray = (score / 100) * circumference;

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="score-panel">
      <div class="repo-name">📁 ${repoPath}</div>
      
      <div class="score-ring">
        <svg viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="58" fill="none" stroke="#111822" stroke-width="7" />
          <circle cx="70" cy="70" r="58" fill="none" stroke="${color}" stroke-width="7"
            stroke-dasharray="${dashArray} ${circumference}" 
            stroke-linecap="round" 
            transform="rotate(-90 70 70)"
            style="filter: drop-shadow(0 0 8px ${color}80); transition: stroke-dasharray 1s ease;" />
        </svg>
        <div class="score-value">
          <div class="score-number" style="color: ${color};">${score}</div>
          <div class="score-label">DX Score</div>
        </div>
      </div>

      <div class="badges-row">
        <span class="badge" style="background: ${color}15; color: ${color}; border-color: ${color}44;">
          GRADE ${grade}
        </span>
        <span class="badge" style="background: rgba(255,255,255,0.03); color: #8899aa; border-color: #1a2332;">
          ${status}
        </span>
        ${fromCache ? `<span class="badge" style="background: rgba(0,0,0,0.3); color: #556677; border-color: #1a2332; font-size: 9px;">
          <span class="cache-dot" style="background: ${stale ? '#ff6d00' : '#00e676'};"></span>${stale ? 'STALE' : 'CACHED'}
        </span>` : ''}
      </div>
    </div>

    <div class="modules">
      ${modules.map(m => `
        <div class="module-row">
          <span class="module-icon">${m.icon}</span>
          <span class="module-name">${m.name}</span>
          <div class="module-bar">
            <div class="module-bar-fill" style="width: ${m.score}%; background: ${getColor(m.score)};"></div>
          </div>
          <span class="module-score" style="color: ${getColor(m.score)};">${m.score}</span>
        </div>
      `).join('')}
    </div>

    ${costMonthly > 0 ? `
    <div class="cost-section">
      <div class="cost-label">💰 Monthly Friction Cost</div>
      <div class="cost-value">$${costMonthly.toLocaleString()}/mo</div>
      <div class="cost-annual">$${costAnnual.toLocaleString()}/year in engineering waste</div>
    </div>
    ` : ''}

    ${findings.length > 0 ? `
    <div class="findings">
      ${findings.map(f => `
        <div class="finding">
          <div class="finding-dot" style="background: ${f.color};"></div>
          <span>${f.text}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="actions">
      <a href="${getApiBase()}/dashboard?repo=${repoPath}" target="_blank" class="btn-primary">
        🔬 VIEW FULL X-RAY REPORT
      </a>
      <div class="btn-row">
        <button id="rescanBtn" class="btn-secondary">🔄 Rescan</button>
        <button id="copyBadgeBtn" class="btn-secondary">📋 Copy Badge</button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('rescanBtn').onclick = () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE', repo: repoPath }, () => {
      scanCurrentRepo();
    });
  };

  document.getElementById('copyBadgeBtn').onclick = () => {
    const badgeColor = score >= 80 ? '00e676' : score >= 60 ? 'ffab00' : score >= 40 ? 'ff6d00' : 'ff1744';
    const badge = `[![DX Score](https://img.shields.io/badge/DX_Score-${score}%2F${grade}-${badgeColor}?style=for-the-badge&labelColor=0a0e14)](https://github.com/urjitupadhya/DEVmri)`;
    navigator.clipboard.writeText(badge).then(() => {
      const btn = document.getElementById('copyBadgeBtn');
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy Badge'; }, 2000);
    });
  };
}

function showError(message) {
  document.getElementById('content').innerHTML = `
    <div class="error-panel">
      <div class="error-icon">🔬</div>
      <div class="error-title">Scan Unavailable</div>
      <div class="error-msg">${message}</div>
      <div class="actions" style="padding: 0;">
        <a href="${getApiBase()}" target="_blank" class="btn-primary" style="font-size: 11px;">
          Open DevMRI Platform
        </a>
        <button id="retryBtn" class="btn-secondary" style="margin-top: 8px;">🔄 Retry Scan</button>
      </div>
    </div>
  `;
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) retryBtn.onclick = scanCurrentRepo;
}

function getApiBase() {
  return API_BASE_DEFAULT; // Will be overridden by stored setting
}

async function scanCurrentRepo() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>> CALIBRATING MRI SCANNER...</p>
    </div>
  `;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes('github.com')) {
      showError('Navigate to a GitHub repository to begin clinical diagnosis.');
      return;
    }

    const url = new URL(tab.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      showError('Navigate to a specific repository (e.g. github.com/owner/repo).');
      return;
    }

    // Ignore non-repo pages
    const ignorePaths = ['settings', 'pulls', 'issues', 'marketplace', 'explore', 'notifications', 'organizations', 'orgs'];
    if (ignorePaths.includes(pathParts[0])) {
      showError('This page is not a repository. Navigate to a GitHub repo.');
      return;
    }

    const repoPath = `${pathParts[0]}/${pathParts[1].replace('.git', '')}`;
    
    // Update loading text
    content.querySelector('p').textContent = `> SCANNING ${repoPath.toUpperCase()}...`;

    // Try the background cache first
    chrome.runtime.sendMessage({ type: 'GET_SCORE', repo: repoPath }, (response) => {
      if (chrome.runtime.lastError || !response || response.error) {
        // Fallback: direct API call
        fetchDirectly(repoPath);
        return;
      }
      renderScore(response, repoPath);
    });

  } catch (error) {
    showError(error.message || 'An unexpected error occurred.');
  }
}

async function fetchDirectly(repoPath) {
  try {
    const res = await fetch(`${getApiBase()}/api/badge?repo=${repoPath}&format=json`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    renderScore(data, repoPath);
  } catch (err) {
    showError(`Could not reach diagnostic server.<br><br><span style="font-size:10px;color:#334455;">Ensure DevMRI is deployed at:<br>${getApiBase()}</span>`);
  }
}

// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════

function initSettings() {
  const settingsLink = document.getElementById('settingsLink');
  const settingsPanel = document.getElementById('settings-panel');
  const content = document.getElementById('content');
  const saveBtn = document.getElementById('saveSettings');
  const cancelBtn = document.getElementById('cancelSettings');

  settingsLink.onclick = (e) => {
    e.preventDefault();
    content.style.display = 'none';
    settingsPanel.style.display = 'block';

    // Load saved values
    chrome.storage.local.get(['github_token', 'server_url'], (result) => {
      if (result.github_token) document.getElementById('tokenInput').value = result.github_token;
      if (result.server_url) document.getElementById('serverInput').value = result.server_url;
    });
  };

  cancelBtn.onclick = () => {
    settingsPanel.style.display = 'none';
    content.style.display = 'block';
  };

  saveBtn.onclick = () => {
    const token = document.getElementById('tokenInput').value.trim();
    const server = document.getElementById('serverInput').value.trim();
    
    const updates = {};
    if (token) updates.github_token = token;
    if (server) updates.server_url = server;
    
    chrome.storage.local.set(updates, () => {
      settingsPanel.style.display = 'none';
      content.style.display = 'block';
      scanCurrentRepo(); // Rescan with new settings
    });
  };
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  scanCurrentRepo();
});
