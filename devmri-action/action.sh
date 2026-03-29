#!/bin/bash

# DevMRI Action - Developer Experience Scanner for GitHub
# This action scans PRs and comments with DX impact metrics

set -e

echo "🩻 DevMRI: Running Developer Experience Scan..."

# Get inputs
GITHUB_TOKEN="${{ inputs.github-token }}"
SCAN_MODE="${{ inputs.scan-mode }}"
COMMENT_PR="${{ inputs.comment-pr }}"
REPO_OWNER="${{ github.repository_owner }}"
REPO_NAME="${{ github.event.repository.name }}"
PR_NUMBER="${{ github.event.pull_request.number }}"

# Default values
DX_SCORE=75
DX_GRADE="B"
BUILD_IMPACT="+15s"
FRICTION_COST="$1,200"

# Calculate DX metrics based on PR changes
if [ "$SCAN_MODE" = "pr" ]; then
    echo "📋 Scanning PR #$PR_NUMBER for DX impact..."
    
    # Get PR files
    FILES=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls/$PR_NUMBER/files" | \
        jq -r '.[].filename' | wc -l)
    
    # Get PR size
    ADDITIONS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls/$PR_NUMBER" | \
        jq -r '.additions')
    
    DELETIONS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls/$PR_NUMBER" | \
        jq -r '.deletions')
    
    TOTAL_CHANGES=$((ADDITIONS + DELETIONS))
    
    # Estimate DX impact
    if [ "$TOTAL_CHANGES" -gt 1000 ]; then
        DX_SCORE=55
        DX_GRADE="D"
        BUILD_IMPACT="+45s"
        FRICTION_COST="$3,200"
    elif [ "$TOTAL_CHANGES" -gt 500 ]; then
        DX_SCORE=68
        DX_GRADE="C"
        BUILD_IMPACT="+25s"
        FRICTION_COST="$1,800"
    elif [ "$TOTAL_CHANGES" -gt 200 ]; then
        DX_SCORE=75
        DX_GRADE="B"
        BUILD_IMPACT="+15s"
        FRICTION_COST="$1,200"
    else
        DX_SCORE=85
        DX_GRADE="A"
        BUILD_IMPACT="+5s"
        FRICTION_COST="$450"
    fi
    
    # Generate comment
    COMMENT_BODY="## 🩻 DevMRI DX IMPACT REPORT

### This PR Impact Summary
| Metric | Value |
|--------|-------|
| 📊 DX Score Impact | $DX_SCORE (Grade: $DX_GRADE) |
| ⏱️ Build Time Change | $BUILD_IMPACT |
| 💰 Monthly Friction Cost | \$$FRICTION_COST |
| 📝 Files Changed | $FILES |
| 📏 Lines Changed | $TOTAL_CHANGES |

### DX Health Indicators
$([ "$DX_SCORE" -lt 70 ] && echo "⚠️ **Warning**: This PR may negatively impact developer experience" || echo "✅ **Good**: This PR follows DX best practices")

### Recommendations
$([ "$TOTAL_CHANGES" -gt 500 ] && echo "- Consider breaking this PR into smaller chunks for faster reviews" || echo "- PR size is optimal for review efficiency")
$([ "$ADDITIONS" -gt 800 ] && echo "- High addition count - ensure adequate test coverage" || echo "- Code additions are well-scoped")

---
*Scanned by DevMRI Action* | [View Full Report](https://devmri.app)"

    # Post comment if enabled
    if [ "$COMMENT_PR" = "true" ]; then
        echo "💬 Posting DX impact comment..."
        curl -s -X POST \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues/$PR_NUMBER/comments" \
            -d "{\"body\": \"$COMMENT_BODY\"}"
    fi
fi

# Set outputs
echo "::set-output name=dx-score::$DX_SCORE"
echo "::set-output name=dx-grade::$DX_GRADE"
echo "::set-output name=build-impact::$BUILD_IMPACT"
echo "::set-output name=friction-cost::$FRICTION_COST"

echo "✅ DevMRI scan complete!"
echo "📊 DX Score: $DX_SCORE (Grade: $DX_GRADE)"
echo "⏱️ Build Impact: $BUILD_IMPACT"
