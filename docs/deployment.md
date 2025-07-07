# Deployment Guide

This document provides comprehensive deployment instructions for the wpweb-static project, with support for both standard terminal and Warp + tmux workflows.

## Prerequisites

- Node.js 18.x or higher
- Git
- Cloudflare account
- Formspree account (for contact form)

## Development Environment Setup

### Option 1: Standard Terminal

```bash
# Clone the repository
git clone https://github.com/haim-barad/wpweb-static.git
cd wpweb-static

# Install dependencies
npm install

# Start development server
npm run dev
```

### Option 2: Warp + tmux Workflow (Recommended)

For users who prefer using Warp terminal with tmux for enhanced productivity:

```bash
# Start a new tmux session
tmux new-session -d -s wpweb-dev

# Split terminal for multiple tasks
tmux split-window -h -t wpweb-dev

# In the first pane: Development server
tmux send-keys -t wpweb-dev:0.0 'cd /path/to/wpweb-static && npm run dev' C-m

# In the second pane: File watching/testing
tmux send-keys -t wpweb-dev:0.1 'cd /path/to/wpweb-static && npm run test:all' C-m

# Attach to session
tmux attach-session -t wpweb-dev
```

#### Tmux Key Bindings for Development

- `Ctrl-b %` - Split pane horizontally
- `Ctrl-b "` - Split pane vertically
- `Ctrl-b arrow` - Navigate between panes
- `Ctrl-b d` - Detach from session
- `Ctrl-b c` - Create new window

## Build and Test

### Local Build Process

```bash
# Run all quality checks
npm run test:all

# Build for production
npm run build

# Preview production build
npm run preview
```

### Quality Assurance Checks

```bash
# Lint JavaScript
npm run lint

# Format code
npm run format

# Test accessibility
npm run test:accessibility

# Check responsive design
npm run test:responsive
```

## Deployment to Cloudflare Pages

### Automated Deployment (Recommended)

1. **Repository Setup**
   - Ensure all changes are committed and pushed to the main branch
   - GitHub Actions will automatically run quality checks

2. **Cloudflare Pages Configuration**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `/`
   - Framework preset: Vite

3. **Environment Variables**
   Set these in Cloudflare Pages dashboard:
   ```
   NODE_VERSION=18
   FORMSPREE_ENDPOINT=https://formspree.io/f/movwzokj
   ```

### Manual Deployment Steps

1. **Connect Repository to Cloudflare Pages**
   ```bash
   # Ensure your repository is up to date
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Cloudflare Pages Setup**
   - Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
   - Click "Create a project"
   - Select "Connect to Git"
   - Choose your repository: `haim-barad/wpweb-static`
   - Configure build settings as specified above

3. **Deploy and Monitor**
   - Click "Save and Deploy"
   - Monitor build logs for any issues
   - Test the deployed site at `https://wpweb-static.pages.dev`

## Advanced Deployment Workflows

### Using Warp + tmux for Deployment Monitoring

```bash
# Create deployment monitoring session
tmux new-session -d -s deploy-monitor

# Multiple panes for different monitoring tasks
tmux split-window -v -t deploy-monitor
tmux split-window -h -t deploy-monitor:0.1

# Pane 1: Git operations
tmux send-keys -t deploy-monitor:0.0 'cd /path/to/wpweb-static && git status' C-m

# Pane 2: Build monitoring
tmux send-keys -t deploy-monitor:0.1 'npm run build && echo "Build completed"' C-m

# Pane 3: Deployment logs
tmux send-keys -t deploy-monitor:0.2 'watch -n 5 "echo Checking deployment status..."' C-m

# Attach to monitoring session
tmux attach-session -t deploy-monitor
```

### Pre-deployment Checklist

Create a tmux session for systematic pre-deployment checks:

```bash
# Create checklist session
tmux new-session -d -s deploy-check

# Run comprehensive checks
tmux send-keys -t deploy-check 'cd /path/to/wpweb-static' C-m
tmux send-keys -t deploy-check 'echo "=== Pre-deployment Checklist ===" && \
npm run test:all && \
npm run build && \
echo "✅ All checks passed - Ready for deployment"' C-m

tmux attach-session -t deploy-check
```

## Environment-Specific Configurations

### Development Environment

```bash
# .env.development (local development)
NODE_ENV=development
VITE_API_URL=http://localhost:3000
VITE_FORMSPREE_ENDPOINT=test-endpoint
```

### Production Environment

```bash
# Environment variables in Cloudflare Pages
NODE_VERSION=18
FORMSPREE_ENDPOINT=https://formspree.io/f/movwzokj
SITE_URL=https://wpweb-static.pages.dev
GOOGLE_ANALYTICS_ID=your-ga-id
```

## Monitoring and Maintenance

### Performance Monitoring

```bash
# Create performance monitoring session
tmux new-session -d -s perf-monitor

# Lighthouse CI in one pane
tmux send-keys -t perf-monitor 'npx lighthouse-ci autorun' C-m

# Split for accessibility monitoring
tmux split-window -v -t perf-monitor
tmux send-keys -t perf-monitor:0.1 'npm run test:accessibility' C-m

tmux attach-session -t perf-monitor
```

### Log Monitoring

```bash
# Monitor deployment logs
tmux new-session -d -s log-monitor

# Watch build logs
tmux send-keys -t log-monitor 'tail -f build.log' C-m

# Split for error monitoring
tmux split-window -h -t log-monitor
tmux send-keys -t log-monitor:0.1 'grep -i error *.log' C-m

tmux attach-session -t log-monitor
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version: `node --version`
   - Verify dependencies: `npm ls`
   - Clear cache: `npm cache clean --force`

2. **Deployment Issues**
   - Verify environment variables in Cloudflare Pages
   - Check build logs for errors
   - Ensure repository permissions are correct

3. **Form Submission Problems**
   - Verify Formspree endpoint configuration
   - Check CORS settings
   - Test with valid email addresses

### Debug Mode with Warp + tmux

```bash
# Create debug session
tmux new-session -d -s debug

# Debug build process
tmux send-keys -t debug 'cd /path/to/wpweb-static && npm run build -- --debug' C-m

# Split for log analysis
tmux split-window -v -t debug
tmux send-keys -t debug:0.1 'tail -f dist/build.log' C-m

# Split for testing
tmux split-window -h -t debug:0.1
tmux send-keys -t debug:0.2 'npm run test:all -- --verbose' C-m

tmux attach-session -t debug
```

## Security Considerations

### Environment Variables

- Never commit sensitive data to version control
- Use Cloudflare Pages environment variables for production secrets
- Validate all environment variables in build scripts

### HTTPS and Security Headers

- Cloudflare Pages automatically provides HTTPS
- Security headers are configured in `public/_headers`
- CSP policies are enforced for XSS protection

## Rollback Procedures

### Quick Rollback

```bash
# Rollback to previous deployment
git log --oneline -5  # Find previous commit
git checkout [previous-commit-hash]
git push origin main --force-with-lease
```

### Staged Rollback with tmux

```bash
# Create rollback session
tmux new-session -d -s rollback

# Backup current state
tmux send-keys -t rollback 'git branch backup-$(date +%Y%m%d)' C-m

# Rollback process
tmux split-window -v -t rollback
tmux send-keys -t rollback:0.1 'git checkout main && git reset --hard HEAD~1' C-m

tmux attach-session -t rollback
```

## Next Steps

1. **Custom Domain Setup**
   - Configure DNS in Cloudflare
   - Set up SSL certificates
   - Update canonical URLs

2. **Performance Optimization**
   - Enable Cloudflare caching
   - Optimize images and assets
   - Monitor Core Web Vitals

3. **Analytics Integration**
   - Configure Google Analytics
   - Set up Cloudflare Analytics
   - Monitor user behavior

For more detailed configuration options, see the [BUILD_SETUP.md](BUILD_SETUP.md) documentation.
