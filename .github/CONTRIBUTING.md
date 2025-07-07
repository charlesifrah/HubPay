# Contributing to HubPay

Thank you for contributing to the HubPay Sales Commission Management System! This document outlines our development workflow and branch naming conventions.

## Branch Naming Convention

Please follow these naming patterns when creating branches:

### Main Branches
- `main` - Production-ready code (protected)
- `develop` - Staging/integration branch (optional)

### Feature Branches
- `feature/description` - New features and enhancements
  - Example: `feature/user-dashboard`
  - Example: `feature/commission-calculator`
  - Example: `feature/invoice-upload`

### Security & Infrastructure Branches
- `security/description` - Security improvements and hardening
  - Example: `security/add-csp-headers`
  - Example: `security/implement-rate-limiting`
  - Example: `security/update-dependencies`

### Bug Fix Branches
- `bugfix/description` - Regular bug fixes
  - Example: `bugfix/commission-calculation-error`
  - Example: `bugfix/login-redirect-issue`

### Emergency Branches
- `hotfix/description` - Critical production fixes
  - Example: `hotfix/payment-processing-down`
  - Example: `hotfix/security-vulnerability`

## Development Workflow

### For New Features
1. **Start from main**: Always create feature branches from the latest `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Develop and test**: Make your changes and test thoroughly in Replit

3. **Commit with clear messages**: Use descriptive commit messages
   ```bash
   git add .
   git commit -m "feat: add commission breakdown modal"
   ```

4. **Push and create PR**: Push your branch and create a Pull Request
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Review and merge**: Get code review, address feedback, then merge

### For Security/Infrastructure Changes
1. **Create security branch**: Engineers should use `security/*` branches
   ```bash
   git checkout -b security/add-authentication-middleware
   ```

2. **Test thoroughly**: Ensure security changes don't break functionality

3. **Document changes**: Include security implications in PR description

4. **Get review**: Security changes require careful review

### Code Review Requirements
- All changes to `main` require Pull Request review
- At least 1 reviewer approval required
- All discussions must be resolved before merge
- Status checks must pass (when configured)

### Commit Message Format
Use conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `security:` - Security improvements
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test additions or changes

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see README.md)
4. Run database migrations: `npm run db:push`
5. Start development server: `npm run dev`

## Questions?

If you have questions about the codebase or development workflow, please:
1. Check the README.md for technical setup
2. Review existing Pull Requests for examples
3. Ask in team discussions before starting major changes

## Branch Protection

The `main` branch is protected with the following rules:
- Pull requests required for all changes
- Code review required before merge
- Status checks must pass
- Administrators must follow the same rules

This ensures code quality and prevents accidental direct pushes to production.