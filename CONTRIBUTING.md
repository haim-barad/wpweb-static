# Contributing to wpweb-static

Thank you for your interest in contributing to wpweb-static! This document provides guidelines and workflows for contributing to the project, with optimized workflows for Warp terminal and tmux users.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Warp + tmux Workflows](#warp--tmux-workflows)
- [Issue Reporting](#issue-reporting)
- [Performance Guidelines](#performance-guidelines)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- Git
- Warp terminal (recommended)
- tmux (optional but recommended)

### Initial Setup

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/wpweb-static.git
cd wpweb-static

# Add upstream remote
git remote add upstream https://github.com/haim-barad/wpweb-static.git

# Install dependencies
npm install

# Start development server
npm run dev
```

### Recommended Development Environment

For optimal productivity, we recommend using Warp terminal with tmux. This setup provides:

- Multiple panes for different development tasks
- Session persistence across terminal restarts
- Enhanced productivity with keyboard shortcuts
- Parallel execution of development tasks

## Development Workflow

### Branch Strategy

We use a feature branch workflow:

```bash
# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Work on your feature
# Commit changes with descriptive messages
git commit -m "Add: descriptive commit message"

# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
```

### Commit Message Guidelines

Use clear, descriptive commit messages:

```bash
# Format: Type: Description
git commit -m "Add: new contact form validation"
git commit -m "Fix: mobile responsive layout issue"
git commit -m "Update: accessibility improvements"
git commit -m "Docs: update deployment guide"
```

**Commit Types:**
- `Add:` - New features
- `Fix:` - Bug fixes  
- `Update:` - Improvements to existing features
- `Docs:` - Documentation changes
- `Test:` - Testing improvements
- `Refactor:` - Code refactoring
- `Style:` - Code formatting/styling

## Code Standards

### JavaScript

- Use ES6+ syntax
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused

### CSS

- Use CSS custom properties for theming
- Follow BEM naming convention
- Mobile-first responsive design
- Use semantic HTML elements

### HTML

- Use semantic HTML5 elements
- Include proper ARIA attributes
- Ensure accessibility compliance
- Optimize for performance

### Code Formatting

```bash
# Format code before committing
npm run format

# Check formatting
npm run format:check

# Lint JavaScript
npm run lint

# Fix linting issues
npm run lint:fix
```

## Testing

### Test Types

1. **Accessibility Testing**
   ```bash
   npm run test:accessibility
   ```

2. **Code Quality**
   ```bash
   npm run lint
   npm run format:check
   ```

3. **Build Testing**
   ```bash
   npm run build
   npm run preview
   ```

4. **Responsive Testing**
   ```bash
   npm run test:responsive
   # Opens test file in browser
   ```

### Test Requirements

- All new features must include accessibility testing
- Code must pass ESLint rules
- Build must complete without errors
- Responsive design must work on mobile devices

## Pull Request Process

### Before Submitting

1. **Run all tests**
   ```bash
   npm run test:all
   ```

2. **Update documentation**
   - Update README.md if needed
   - Add JSDoc comments
   - Update relevant documentation files

3. **Check build**
   ```bash
   npm run build
   ```

### Pull Request Template

When creating a pull request, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Other (please describe)

## Testing
- [ ] Accessibility tests pass
- [ ] Code quality checks pass
- [ ] Build completes successfully
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated Checks**
   - GitHub Actions will run quality checks
   - All checks must pass

2. **Code Review**
   - At least one maintainer review required
   - Address all feedback before merging

3. **Testing**
   - Manual testing of new features
   - Cross-browser compatibility check

## Warp + tmux Workflows

### Development Session Setup

Create a comprehensive development environment:

```bash
# Create main development session
tmux new-session -d -s wpweb-dev

# Window 1: Development server
tmux rename-window -t wpweb-dev:0 'dev-server'
tmux send-keys -t wpweb-dev:0 'cd /path/to/wpweb-static && npm run dev' C-m

# Window 2: Testing and quality checks
tmux new-window -t wpweb-dev -n 'testing'
tmux send-keys -t wpweb-dev:1 'cd /path/to/wpweb-static' C-m

# Split testing window
tmux split-window -h -t wpweb-dev:1
tmux send-keys -t wpweb-dev:1.1 'npm run test:accessibility' C-m

# Window 3: Git operations
tmux new-window -t wpweb-dev -n 'git'
tmux send-keys -t wpweb-dev:2 'cd /path/to/wpweb-static && git status' C-m

# Window 4: Build and preview
tmux new-window -t wpweb-dev -n 'build'
tmux send-keys -t wpweb-dev:3 'cd /path/to/wpweb-static' C-m

# Attach to session
tmux attach-session -t wpweb-dev
```

### Quick Development Commands

```bash
# Quick setup script (add to ~/.bashrc or ~/.zshrc)
wpweb-dev() {
    cd /path/to/wpweb-static
    tmux new-session -d -s wpweb-dev
    tmux send-keys -t wpweb-dev 'npm run dev' C-m
    tmux split-window -h -t wpweb-dev
    tmux send-keys -t wpweb-dev:0.1 'npm run test:all' C-m
    tmux attach-session -t wpweb-dev
}

# Usage: wpweb-dev
```

### Feature Development Workflow

```bash
# Create feature development session
tmux new-session -d -s feature-dev

# Main development pane
tmux send-keys -t feature-dev 'cd /path/to/wpweb-static' C-m
tmux send-keys -t feature-dev 'git checkout -b feature/new-feature' C-m

# Split for file editing
tmux split-window -v -t feature-dev
tmux send-keys -t feature-dev:0.1 'npm run dev' C-m

# Split for testing
tmux split-window -h -t feature-dev:0.1
tmux send-keys -t feature-dev:0.2 'npm run test:accessibility' C-m

tmux attach-session -t feature-dev
```

### Code Review Session

```bash
# Create code review session
tmux new-session -d -s code-review

# Main review pane
tmux send-keys -t code-review 'cd /path/to/wpweb-static' C-m
tmux send-keys -t code-review 'git diff main..feature-branch' C-m

# Split for testing changes
tmux split-window -h -t code-review
tmux send-keys -t code-review:0.1 'npm run test:all' C-m

tmux attach-session -t code-review
```

## Issue Reporting

### Bug Reports

When reporting bugs, include:

1. **Environment Information**
   - Operating system
   - Browser version
   - Node.js version
   - npm version

2. **Steps to Reproduce**
   - Clear step-by-step instructions
   - Expected vs actual behavior
   - Screenshots or videos if applicable

3. **Additional Context**
   - Console error messages
   - Network requests (if relevant)
   - Any recent changes made

### Feature Requests

When requesting features:

1. **Use Case Description**
   - Why is this feature needed?
   - How will it improve the project?

2. **Proposed Solution**
   - Detailed description of the feature
   - Alternative solutions considered

3. **Implementation Notes**
   - Technical considerations
   - Potential challenges

## Performance Guidelines

### Optimization Priorities

1. **Core Web Vitals**
   - Largest Contentful Paint (LCP) < 2.5s
   - First Input Delay (FID) < 100ms
   - Cumulative Layout Shift (CLS) < 0.1

2. **Bundle Size**
   - Keep JavaScript bundles under 100KB
   - Optimize images and assets
   - Use tree shaking for unused code

3. **Accessibility**
   - WCAG 2.1 AA compliance
   - Keyboard navigation support
   - Screen reader compatibility

### Performance Testing

```bash
# Performance testing session
tmux new-session -d -s perf-test

# Lighthouse testing
tmux send-keys -t perf-test 'npx lighthouse http://localhost:3000' C-m

# Bundle analysis
tmux split-window -h -t perf-test
tmux send-keys -t perf-test:0.1 'npm run build && npx vite-bundle-analyzer dist' C-m

tmux attach-session -t perf-test
```

## Documentation

### Documentation Standards

- Use clear, concise language
- Include code examples
- Update relevant documentation with changes
- Use proper markdown formatting

### Documentation Types

1. **Code Documentation**
   - JSDoc comments for functions
   - Inline comments for complex logic
   - README files for components

2. **User Documentation**
   - Setup and installation guides
   - Usage examples
   - Troubleshooting guides

3. **Developer Documentation**
   - Architecture decisions
   - API documentation
   - Contributing guidelines

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn
- Maintain professional communication

### Getting Help

- Check existing issues and documentation
- Join discussions in GitHub Discussions
- Ask questions in pull requests
- Reach out to maintainers if needed

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Deployment successful

## Tools and Resources

### Recommended Tools

- **Terminal**: Warp
- **Session Management**: tmux
- **Code Editor**: VS Code with extensions
- **Browser**: Chrome DevTools for debugging
- **Version Control**: Git with conventional commits

### Useful Resources

- [Warp Terminal Documentation](https://docs.warp.dev/)
- [tmux Cheat Sheet](https://tmuxcheatsheet.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Questions?

If you have questions about contributing:

1. Check the documentation
2. Search existing issues
3. Create a new issue with the "question" label
4. Reach out to maintainers

Thank you for contributing to wpweb-static! 🎉
