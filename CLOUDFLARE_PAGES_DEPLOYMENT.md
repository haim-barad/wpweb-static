# Cloudflare Pages Deployment Guide

This guide provides step-by-step instructions for deploying the wpweb-static project to Cloudflare Pages.

## Prerequisites

- Cloudflare account (free tier available)
- GitHub repository with project code
- Node.js project with build configuration

## Project Configuration

### Build Settings
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: 18.x

### Repository Information
- **Repository**: https://github.com/haim-barad/wpweb-static.git
- **Branch**: main
- **Root Directory**: / (project root)

## Step-by-Step Deployment

### 1. Connect Repository to Cloudflare Pages

1. **Login to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Login with your Cloudflare account

2. **Navigate to Pages**
   - In the left sidebar, click on **Pages**
   - Click **Create a project**

3. **Connect to Git**
   - Select **Connect to Git**
   - Choose **GitHub** as your Git provider
   - Authorize Cloudflare to access your GitHub account
   - Select the repository: `haim-barad/wpweb-static`

### 2. Configure Build Settings

1. **Set up build and deployments**
   - **Project name**: `wpweb-static`
   - **Production branch**: `main`
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

2. **Environment variables** (Advanced settings)
   - **Node.js version**: `18`
   - **NPM version**: `9`

### 3. Environment Variables Setup

Add the following environment variables in the Cloudflare Pages dashboard:

#### Required Variables
```
NODE_VERSION=18
NPM_VERSION=9
FORMSPREE_ENDPOINT=https://formspree.io/f/movwzokj
```

#### Optional Variables
```
GOOGLE_ANALYTICS_ID=your-ga-id
SITE_URL=https://your-custom-domain.com
SITE_NAME=WPWeb Static
SITE_DESCRIPTION=Professional WordPress maintenance and security services
VITE_BUILD_SOURCEMAP=false
VITE_BUILD_MINIFY=true
```

### 4. Formspree Configuration

1. **Login to Formspree**
   - Go to [formspree.io](https://formspree.io)
   - Login with your account credentials

2. **Update Form Endpoint**
   - The current endpoint is: `https://formspree.io/f/movwzokj`
   - If you need a new endpoint, create a new form in Formspree
   - Update the `FORMSPREE_ENDPOINT` environment variable in Cloudflare Pages

3. **Configure Form Settings**
   - Set notification email to: `haim@wpweb.org`
   - Enable spam protection
   - Set up thank you page redirect (optional)

### 5. Custom Domain Configuration

1. **Add Custom Domain**
   - In Cloudflare Pages dashboard, go to your project
   - Click **Custom domains** tab
   - Click **Set up a custom domain**
   - Enter your domain name (e.g., `wpweb.org`)

2. **DNS Configuration**
   - Add a CNAME record pointing to your Pages domain
   - Example: `wpweb.org` → `wpweb-static.pages.dev`

3. **SSL/TLS Settings**
   - SSL is automatically enabled for all Cloudflare Pages
   - Certificate is automatically provisioned and renewed

### 6. Redirect Rules

The project includes a `_redirects` file in the `public` directory with the following rules:

```
# Handle trailing slashes
/services/ /services.html 301
/index/ / 301

# Redirect common WordPress paths to static equivalents
/wp-admin/* / 302
/wp-login.php / 302
/xmlrpc.php / 302

# Handle 404s by serving index.html (SPA fallback)
/* /index.html 404
```

### 7. Additional Configuration

#### Headers Configuration
Create a `_headers` file in the `public` directory for security headers:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

#### Security Headers
Add these in Cloudflare Pages dashboard under **Functions** → **Pages Functions**:

```javascript
export async function onRequest(context) {
  const response = await context.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
```

## Deployment Status

### Current Status
- ✅ Repository connected
- ✅ Build configuration set
- ✅ Environment variables configured
- ✅ Formspree integration ready
- ⏳ Custom domain setup (pending)
- ⏳ SSL certificate (automatic)
- ⏳ Redirect rules verified

### Deployment URL
- **Preview**: https://wpweb-static.pages.dev
- **Custom Domain**: (to be configured)

## Monitoring and Analytics

### Build Status
- Build logs are available in the Cloudflare Pages dashboard
- Failed builds will show detailed error messages
- Build history is maintained for troubleshooting

### Analytics Integration
- Google Analytics integration is configured
- Custom analytics events are tracked for form submissions
- Performance metrics are available in Cloudflare Analytics

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are listed in package.json
   - Review build logs for specific errors

2. **Form Submission Issues**
   - Verify Formspree endpoint is correct
   - Check CORS settings in Formspree dashboard
   - Ensure form action URL matches deployed domain

3. **Custom Domain Issues**
   - Verify DNS settings are correct
   - Check SSL certificate status
   - Ensure domain is properly configured in Cloudflare

### Support Resources
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Vite Build Configuration](https://vitejs.dev/guide/build.html)
- [Formspree Documentation](https://help.formspree.io/)

## Deployment Checklist

- [ ] Repository connected to Cloudflare Pages
- [ ] Build command set to `npm run build`
- [ ] Output directory set to `dist`
- [ ] Node.js version set to 18
- [ ] Environment variables configured
- [ ] Formspree endpoint updated
- [ ] Custom domain added (if applicable)
- [ ] SSL certificate verified
- [ ] Redirect rules tested
- [ ] Form submission tested
- [ ] Analytics tracking verified
- [ ] Performance optimization enabled

## Next Steps

1. **Deploy to Production**
   - Push changes to main branch
   - Monitor build process
   - Test deployed site functionality

2. **Custom Domain Setup**
   - Configure DNS settings
   - Add custom domain in Cloudflare
   - Verify SSL certificate

3. **Performance Optimization**
   - Enable Cloudflare's performance features
   - Configure caching rules
   - Monitor Core Web Vitals

4. **Security Enhancements**
   - Enable bot protection
   - Configure firewall rules
   - Set up security headers

---

*Last updated: $(date)*
*Status: Ready for deployment*
