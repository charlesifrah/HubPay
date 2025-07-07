# GitHub Workflow for HubPay Project

## Repository: https://github.com/charlesifrah/HubPay

## Branch Strategy
- `main` → Production-ready code (protected)
- `develop` → Staging/integration branch (optional)
- `feature/*` → Your new features
- `security/*` → Engineers' security/infrastructure changes

## Your Development Workflow

### Starting a New Feature
```bash
# 1. Switch to main and get latest changes
git checkout main
git pull origin main

# 2. Create new feature branch
git checkout -b feature/your-feature-name

# 3. Work on your feature in Replit
# ... make changes ...

# 4. Commit and push
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name

# 5. Create Pull Request on GitHub
# Go to https://github.com/charlesifrah/HubPay/pulls
# Click "New pull request"
# Select your feature branch to merge into main
```

### Keeping Your Branch Up to Date
```bash
# If working on a long-running feature
git checkout main
git pull origin main
git checkout feature/your-feature-name
git merge main
# or
git rebase main
```

### Quick Commands
```bash
# Check current branch and status
git branch
git status

# View recent commits
git log --oneline -10

# Check what's changed
git diff

# Push current branch
git push origin HEAD
```

## Engineers' Workflow
Your engineers will:
1. Create `security/*` branches for infrastructure/security changes
2. Submit PRs to merge into `main`
3. Set up cloud deployment that pulls from `main` branch
4. Handle production deployment and monitoring

## Collaboration Best Practices
- ✅ Always work on feature branches
- ✅ Create descriptive commit messages
- ✅ Keep PRs focused and small
- ✅ Test features in Replit before pushing
- ✅ Never push directly to main
- ✅ Communicate with engineers about major changes

## Emergency Fixes
For urgent fixes:
```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-description
# ... make fix ...
git add .
git commit -m "fix: urgent fix description"
git push origin hotfix/fix-description
# Create PR and merge immediately after review
```