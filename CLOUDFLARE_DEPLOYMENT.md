# Cloudflare Pages Deployment Guide for WPWeb

## Overview
This guide covers deploying the WPWeb static site to Cloudflare Pages and configuring the custom domain `wpweb.org`.

## Pre-Deployment Checklist

### ✅ Completed
- [x] Static site with Vite build system
- [x] Responsive design with breakpoints
- [x] Accessibility features implemented
- [x] Contact form with Formspree integration
- [x] GitHub repository ready
- [x] Build configuration (vite.config.js)

### 🔧 Needs Attention
- [ ] Fix color contrast issues (some ratios below WCAG AA)
- [ ] Complete responsive breakpoint implementation
- [ ] Test production build locally

## Cloudflare Pages Setup

### 1. Create Cloudflare Pages Project

1. **Log in to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Navigate to "Pages" in the sidebar

2. **Connect GitHub Repository**
   - Click "Create a project"
   - Choose "Connect to Git"
   - Select your GitHub account
   - Choose the `haim-barad/wpweb-static` repository

3. **Configure Build Settings**
   ```
   Project name: wpweb-static
   Production branch: main
   Build command: npm run build
   Build output directory: dist
   Root directory: (leave empty)
   ```

4. **Environment Variables** (if needed)
   ```
   NODE_VERSION=18
   NPM_VERSION=latest
   ```

### 2. Build Configuration

Your current `vite.config.js` is properly configured:

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'src/index.html',
        services: 'src/services.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
```

### 3. Test Local Production Build

Before deploying, test the production build:

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Test the build
cd dist && python3 -m http.server 8000
```

## Domain Configuration

### Current Situation Analysis
Based on the external context, `wpweb.org` currently hosts a WordPress site with:
- Existing content and branding
- Current services (Basic $99, Pro $299, Premium $1199)
- Established business operations

### Migration Strategy Options

#### Option 1: Gradual Migration (Recommended)
1. **Deploy to subdomain first**: `new.wpweb.org` or `static.wpweb.org`
2. **Test thoroughly** with real users
3. **Update DNS** to point main domain after validation

#### Option 2: Direct Replacement
1. **Deploy to Cloudflare Pages**
2. **Update DNS immediately** to point to new site
3. **Higher risk** but faster transition

### DNS Configuration Steps

#### For Cloudflare Pages Custom Domain:

1. **Add Custom Domain in Cloudflare Pages**
   - In your Pages project dashboard
   - Go to "Custom domains" tab
   - Click "Set up a custom domain"
   - Enter `wpweb.org`

2. **DNS Records to Configure**
   ```
   Type: CNAME
   Name: wpweb.org (or @)
   Target: your-project-name.pages.dev
   Proxy: Enabled (orange cloud)
   
   Type: CNAME  
   Name: www
   Target: wpweb.org
   Proxy: Enabled (orange cloud)
   ```

3. **SSL Certificate**
   - Cloudflare will automatically provision SSL
   - Usually takes 5-15 minutes to activate

## Deployment Commands and Settings

### Cloudflare Pages Build Settings
```yaml
Build command: npm run build
Build output directory: dist
Root directory: (empty)
Node.js version: 18
```

### Package.json Scripts (Already Configured)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Automatic Deployments
- **Production**: Triggered on pushes to `main` branch
- **Preview**: Triggered on pull requests
- **Deploy URL**: `https://your-project-name.pages.dev`

## Pre-Launch Testing Checklist

### 1. Fix Outstanding Issues
Run the accessibility test and fix critical issues:
```bash
npm run test:accessibility
```

**Critical Fixes Needed:**
- Color contrast ratios (update CSS custom properties)
- Complete responsive breakpoint implementation
- Form label associations

### 2. Content Updates
- [ ] Update contact information
- [ ] Verify all links work
- [ ] Test contact form submission
- [ ] Check mobile responsiveness

### 3. Performance Testing
- [ ] Run Lighthouse audit
- [ ] Test loading speeds
- [ ] Verify image optimization

## Recommended Deployment Timeline

### Phase 1: Preparation (1-2 days)
1. Fix accessibility issues identified in testing
2. Complete responsive design implementation
3. Test production build locally
4. Content review and updates

### Phase 2: Staging Deployment (1 day)
1. Deploy to Cloudflare Pages
2. Test on staging URL (`your-project.pages.dev`)
3. Configure subdomain for testing (`staging.wpweb.org`)
4. User acceptance testing

### Phase 3: Production Launch (1 day)
1. DNS cutover to new site
2. Monitor for issues
3. Set up redirects if needed
4. Update any external references

## Post-Deployment Monitoring

### Analytics Setup
1. **Google Analytics 4**
   - Add tracking code to HTML templates
   - Configure goals and conversions

2. **Cloudflare Analytics**
   - Built-in with Pages
   - Monitor traffic and performance

### Form Monitoring
- Monitor Formspree submissions
- Test form functionality regularly
- Set up notification alerts

## Rollback Plan

In case issues arise:

1. **DNS Rollback**
   - Change DNS back to original hosting
   - Usually takes 5-15 minutes

2. **Cloudflare Pages Rollback**
   - Use deployment history to rollback
   - Previous versions available instantly

## Security Considerations

### Content Security Policy
Add to your HTML `<head>`:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; img-src 'self' https: data:; connect-src 'self' https://formspree.io;">
```

### HTTPS Redirect
Cloudflare automatically handles HTTPS redirects when proxy is enabled.

## Cost Considerations

### Cloudflare Pages Pricing
- **Free tier**: 500 builds/month, unlimited bandwidth
- **Pro tier**: $20/month for advanced features
- **Custom domains**: Free
- **SSL certificates**: Free

### Migration from Current Hosting
- Compare current hosting costs
- Consider WordPress hosting elimination
- Factor in maintenance time savings

## Support and Troubleshooting

### Common Issues
1. **Build failures**: Check Node.js version compatibility
2. **DNS propagation**: Can take up to 48 hours globally
3. **SSL certificate issues**: Usually resolve automatically

### Getting Help
- Cloudflare community forums
- Cloudflare support (for paid plans)
- GitHub repository for code issues

## Next Steps

1. **Immediate**: Fix accessibility issues identified in testing
2. **This week**: Deploy to Cloudflare Pages staging
3. **Next week**: Plan DNS cutover and launch
4. **Ongoing**: Monitor and optimize performance

Would you like me to help fix the accessibility issues before deployment?
