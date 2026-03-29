# DevMRI GitHub Action

Automatically scan pull requests and comment with Developer Experience (DX) impact metrics.

## Features

- **DX Score Calculation**: Analyzes PR size and complexity to calculate a DX impact score
- **Build Time Estimation**: Estimates how this PR will affect CI/CD build times  
- **Friction Cost Analysis**: Calculates monthly developer friction cost impact
- **Automatic Comments**: Posts DX impact report directly on PRs

## Usage

```yaml
name: DevMRI DX Scanner

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  devmri:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run DevMRI DX Scan
        uses: your-org/devmri-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          scan-mode: 'pr'
          comment-pr: 'true'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | Yes | - | GitHub token for API access |
| `scan-mode` | No | `pr` | Scan mode: `pr`, `full`, or `quick` |
| `comment-pr` | No | `true` | Whether to comment on PR with DX impact |

## Outputs

| Output | Description |
|--------|-------------|
| `dx-score` | DX Score (0-100) |
| `dx-grade` | DX Grade (A-F) |
| `build-impact` | Estimated build time change |
| `friction-cost` | Estimated monthly friction cost |

## Example PR Comment

When enabled, the action will post a comment like:

> ## 🩻 DevMRI DX IMPACT REPORT
> 
> ### This PR Impact Summary
> | Metric | Value |
> |--------|-------|
> | 📊 DX Score Impact | 75 (Grade: B) |
> | ⏱️ Build Time Change | +15s |
> | 💰 Monthly Friction Cost | $1,200 |
> 
> ### DX Health Indicators
> ✅ **Good**: This PR follows DX best practices
> 
> ---
> *Scanned by DevMRI Action* | [View Full Report](https://devmri.app)

## License

MIT
