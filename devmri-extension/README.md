# 🩻 DevMRI Chrome Extension

**See DX Scores directly on GitHub.** The DevMRI extension injects clinical-grade developer experience diagnostics into every GitHub repository page.

## Features

| Feature | Description |
|---------|-------------|
| **Inline Badge** | DX Score badge appears next to the repo name |
| **Sidebar Widget** | Score ring, grade, and friction cost in the repo sidebar |
| **Popup Dashboard** | Click the extension icon for a full diagnostic overview |
| **Score Caching** | Results cached for 30 minutes to reduce API calls |
| **Badge Generator** | Copy a README badge with one click |
| **Settings** | Configure GitHub token and server URL |
| **SPA Navigation** | Works with GitHub's Turbo/SPA page navigation |
| **Light/Dark Mode** | Adapts to GitHub's theme automatically |

## Installation

### From Source (Developer Mode)

1. Clone the repo:
   ```bash
   git clone https://github.com/urjitupadhya/DEVmri.git
   ```

2. Open Chrome → `chrome://extensions/`

3. Enable **Developer mode** (top right)

4. Click **Load unpacked** → Select the `devmri-extension/` folder

5. Navigate to any GitHub repository — you'll see the DX Score badge!

### Optional: Add GitHub Token

1. Click the DevMRI extension icon
2. Click **Settings** in the footer
3. Paste your GitHub Personal Access Token
4. This increases your rate limit from 60 to 5,000 requests/hour

## How It Works

```
GitHub Page → Content Script reads repo → 
  → Background Worker checks cache →
  → API call to DevMRI server →
  → Score injected into page UI
```

The extension talks to the DevMRI API (`/api/badge?repo=owner/repo&format=json`) which runs a quick scan and returns:
- DX Score (0-100)
- Grade (A-F)
- Module scores (CI/CD, Reviews, Dependencies, Docs)
- Friction cost estimate

## Architecture

```
devmri-extension/
├── manifest.json        # Extension manifest (MV3)
├── background.js        # Service worker for caching
├── popup.html           # Popup UI
├── popup.js             # Popup logic
├── content.js           # Injects badges into GitHub
├── content.css          # Badge & widget styles
└── icons/               # Extension icons
    └── icon.svg
```

## Screenshots

### Inline Badge
The DX Score appears directly on the GitHub repository page, next to the repo name.

### Popup Dashboard
Click the extension icon to see a full clinical diagnostic with score ring, module bars, and friction cost.

### Sidebar Widget
The sidebar shows the score, grade, and a link to the full X-Ray report.

---

<sub>🩻 Part of the [DevMRI](https://github.com/urjitupadhya/DEVmri) platform · DX-Ray Hackathon 2026</sub>
