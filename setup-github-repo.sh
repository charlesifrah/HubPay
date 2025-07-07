#!/bin/bash

# GitHub Repository Setup Script for HubPay
# Repository: https://github.com/charlesifrah/HubPay

echo "🚀 Setting up GitHub repository for collaboration..."

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a Git repository"
    exit 1
fi

echo "✅ Git repository detected"

# Show current status
echo "📋 Current Git status:"
git status --short

echo "📋 Current branch:"
git branch --show-current

echo "📋 Remote repository:"
git remote -v

# Add all current changes
echo "📦 Adding all changes..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit"
else
    echo "📝 Committing current changes..."
    git commit -m "feat: prepare repository for team collaboration

- Added GitHub workflow documentation
- Updated Clear Database functionality
- Enhanced payout details modals
- Ready for production hardening by engineering team"
fi

# Push to main branch
echo "🚀 Pushing to main branch..."
git push origin main

# Create develop branch if it doesn't exist
if git show-ref --verify --quiet refs/heads/develop; then
    echo "✅ Develop branch already exists"
else
    echo "🌟 Creating develop branch..."
    git checkout -b develop
    git push origin develop
    git checkout main
fi

echo "✅ Repository setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Go to https://github.com/charlesifrah/HubPay"
echo "2. Set up branch protection rules in Settings → Branches"
echo "3. Share repository with your engineers"
echo "4. Start using feature branches for new development"
echo ""
echo "📖 See git-workflow.md for detailed workflow instructions"