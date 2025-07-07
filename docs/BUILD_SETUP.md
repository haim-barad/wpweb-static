# Build Setup Documentation

## Overview
This project uses modern build tooling with Vite for fast development and optimized production builds.

## Available Scripts

### Development
```bash
npm run dev
```
Starts the development server with hot reload on port 3000.

### Production Build
```bash
npm run build
```
Creates optimized production build in the `dist/` directory.

### Preview Build
```bash
npm run preview
```
Serves the production build locally for testing.

### Code Quality
```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues automatically
npm run format        # Format code with Prettier
npm run format:check  # Check Prettier formatting
```

## Dependencies

### Build Tools
- **Vite**: Fast build tool with hot reload
- **Terser**: JavaScript minification

### Code Quality
- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **eslint-config-prettier**: Disable ESLint formatting rules
- **eslint-plugin-prettier**: Run Prettier as ESLint rule

### Libraries
- **AOS**: Animate On Scroll library
- **@accessible/accordion**: Accessible accordion component

## Configuration Files

### `vite.config.js`
- Sets `src/` as root directory
- Configures build output to `dist/`
- Enables CSS and JS minification
- Sets up vendor chunk splitting

### `.eslintrc.js`
- ESLint configuration for modern JavaScript
- Integrates with Prettier
- Browser and Node.js environment support

### `.prettierrc`
- Consistent code formatting rules
- Single quotes, no semicolons
- 2-space indentation

## GitHub Actions
The project includes a GitHub Actions workflow (`.github/workflows/code-quality.yml`) that:
- Runs on PRs and pushes to main/develop branches
- Installs dependencies
- Runs ESLint
- Checks Prettier formatting
- Builds the project
- Uploads build artifacts

## Project Structure
```
src/
├── index.html          # Main HTML file
├── scripts/
│   └── main.js        # Main JavaScript entry point
└── styles/
    └── main.css       # Main CSS file
```

## Features Implemented
1. ✅ Lightweight Vite build tooling
2. ✅ Live reload development server
3. ✅ Production minification
4. ✅ ESLint & Prettier integration
5. ✅ GitHub Actions for PRs
6. ✅ AOS scroll animations
7. ✅ Accessible accordion component
8. ✅ Modern ES6+ JavaScript support
9. ✅ CSS preprocessing and minification
10. ✅ Optimized vendor chunk splitting
