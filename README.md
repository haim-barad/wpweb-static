# wpweb-static

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

This project is configured for seamless deployment on Cloudflare Pages:

- **Build Command**: `npm run build`
- **Output Directory**: `public/`
- **Node.js Version**: Latest LTS

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
