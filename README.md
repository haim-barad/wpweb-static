# wpweb-static

[![Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-orange?logo=cloudflare&logoColor=white)](https://wpweb-static.pages.dev)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)](https://github.com/haim-barad/wpweb-static/actions)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

A modern static website project designed for deployment on Cloudflare Pages.

## Purpose

This project serves as a static website foundation built with modern web technologies, optimized for performance and ease of deployment through Cloudflare Pages.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Build Tools**: Node.js ecosystem
- **Deployment**: Cloudflare Pages
- **Version Control**: Git

## Project Structure

```
wpweb-static/
├── src/           # Source files (HTML, CSS, JS)
├── public/        # Static assets and build output
├── assets/        # Raw assets (images, fonts, etc.)
├── docs/          # Documentation
├── .github/       # GitHub Actions workflows
└── README.md      # This file
```

## Cloudflare Pages Deployment

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Pages-orange?logo=cloudflare)](https://dash.cloudflare.com/)

This project is configured for seamless deployment on Cloudflare Pages:

- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Node.js Version**: 18.x
- **Framework**: Vite
- **Repository**: https://github.com/haim-barad/wpweb-static.git

### Quick Deploy

1. **Connect Repository**: Link your GitHub repository to Cloudflare Pages
2. **Configure Build**: Set build command to `npm run build` and output directory to `dist`
3. **Set Environment Variables**: Add `FORMSPREE_ENDPOINT` and other required variables
4. **Deploy**: Push to main branch to trigger automatic deployment

### Environment Variables

```bash
# Required
NODE_VERSION=18
FORMSPREE_ENDPOINT=https://formspree.io/f/movwzokj

# Optional
GOOGLE_ANALYTICS_ID=your-ga-id
SITE_URL=https://your-custom-domain.com
```

### Deployment Status

- ✅ **Build Configuration**: Ready
- ✅ **Environment Variables**: Configured
- ✅ **Formspree Integration**: Active
- ✅ **Security Headers**: Enabled
- ✅ **Redirect Rules**: Configured
- ⏳ **Custom Domain**: Pending setup

For detailed deployment instructions, see [CLOUDFLARE_PAGES_DEPLOYMENT.md](CLOUDFLARE_PAGES_DEPLOYMENT.md).

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
