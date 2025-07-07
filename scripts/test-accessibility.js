#!/usr/bin/env node

/**
 * WPWeb Automated Accessibility & Responsive Testing
 * 
 * This script performs automated testing for:
 * - Color contrast ratios
 * - Responsive breakpoints
 * - Basic accessibility checks
 * - Cross-browser compatibility validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color contrast calculation utilities
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// WPWeb color palette from CSS custom properties
const colorPalette = {
  primary: '#0170B9',
  secondary: '#01BAEF', 
  accent: '#20BF55',
  orange: '#FF930F',
  dark: '#4B4F58',
  light: '#F5F5F5',
  white: '#FFFFFF',
  gray: '#7A7A7A'
};

// Required responsive breakpoints
const breakpoints = [
  { name: 'Large Desktop', width: 1200, minWidth: true },
  { name: 'Desktop', width: 992 },
  { name: 'Tablet Portrait', width: 768 },
  { name: 'Mobile', width: 480 }
];

// Test color contrast ratios
function testColorContrast() {
  console.log('\n🎨 Color Contrast Testing');
  console.log('=' .repeat(50));
  
  const testCombinations = [
    { name: 'Body text', fg: colorPalette.dark, bg: colorPalette.white, level: 'AA', required: 4.5 },
    { name: 'Primary button', fg: colorPalette.white, bg: colorPalette.primary, level: 'AA', required: 4.5 },
    { name: 'Secondary button', fg: colorPalette.secondary, bg: colorPalette.white, level: 'AA', required: 4.5 },
    { name: 'Accent elements', fg: colorPalette.white, bg: colorPalette.accent, level: 'AA', required: 4.5 },
    { name: 'Gray text', fg: colorPalette.gray, bg: colorPalette.white, level: 'AA', required: 4.5 },
    { name: 'Orange elements', fg: colorPalette.white, bg: colorPalette.orange, level: 'AA', required: 4.5 }
  ];
  
  let passCount = 0;
  const results = [];
  
  testCombinations.forEach(test => {
    const ratio = getContrastRatio(test.fg, test.bg);
    const passes = ratio >= test.required;
    const level = ratio >= 7 ? 'AAA' : (ratio >= 4.5 ? 'AA' : 'FAIL');
    
    if (passes) passCount++;
    
    results.push({
      name: test.name,
      ratio: ratio.toFixed(2),
      level: level,
      passes: passes
    });
    
    const status = passes ? '✅' : '❌';
    console.log(`${status} ${test.name.padEnd(20)} ${test.fg} / ${test.bg} = ${ratio.toFixed(2)}:1 (${level})`);
  });
  
  console.log(`\nColor Contrast Summary: ${passCount}/${testCombinations.length} tests passed`);
  return results;
}

// Test responsive breakpoints in CSS
function testResponsiveBreakpoints() {
  console.log('\n📱 Responsive Breakpoint Testing');
  console.log('=' .repeat(50));
  
  // Read the CSS file to check for media queries
  const cssPath = path.join(__dirname, '../src/styles/main.css');
  
  if (!fs.existsSync(cssPath)) {
    console.log('❌ CSS file not found:', cssPath);
    return false;
  }
  
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const results = [];
  
  breakpoints.forEach(bp => {
    const mediaQuery = bp.minWidth 
      ? `@media (min-width: ${bp.width}px)`
      : `@media (max-width: ${bp.width}px)`;
    
    const hasMediaQuery = cssContent.includes(`@media (max-width: ${bp.width}px)`) || 
                         cssContent.includes(`@media (min-width: ${bp.width}px)`);
    
    const status = hasMediaQuery ? '✅' : '❌';
    console.log(`${status} ${bp.name.padEnd(20)} ${bp.width}px breakpoint`);
    
    results.push({
      name: bp.name,
      width: bp.width,
      found: hasMediaQuery
    });
  });
  
  const passCount = results.filter(r => r.found).length;
  console.log(`\nBreakpoint Summary: ${passCount}/${breakpoints.length} breakpoints implemented`);
  
  return results;
}

// Check accessibility features in HTML
function testAccessibilityFeatures() {
  console.log('\n♿ Accessibility Features Testing');
  console.log('=' .repeat(50));
  
  const htmlFiles = ['src/index.html', 'src/services.html'];
  const results = [];
  
  htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${file}`);
      return;
    }
    
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    
    const tests = [
      {
        name: 'Skip link',
        test: () => htmlContent.includes('skip-link') && htmlContent.includes('Skip to main content'),
        description: 'Skip to main content link present'
      },
      {
        name: 'ARIA labels',
        test: () => htmlContent.includes('aria-label') || htmlContent.includes('aria-labelledby'),
        description: 'ARIA labels used for accessibility'
      },
      {
        name: 'Alt attributes',
        test: () => {
          const imgTags = htmlContent.match(/<img[^>]*>/g) || [];
          return imgTags.every(img => img.includes('alt='));
        },
        description: 'All images have alt attributes'
      },
      {
        name: 'Form labels',
        test: () => {
          const inputCount = (htmlContent.match(/<input[^>]*>/g) || []).length;
          const labelCount = (htmlContent.match(/<label[^>]*>/g) || []).length;
          return inputCount > 0 && labelCount >= inputCount;
        },
        description: 'Form inputs have associated labels'
      },
      {
        name: 'Semantic HTML',
        test: () => {
          const semanticElements = ['<main', '<header', '<nav', '<section', '<article', '<aside', '<footer'];
          return semanticElements.some(el => htmlContent.includes(el));
        },
        description: 'Semantic HTML elements used'
      },
      {
        name: 'Heading hierarchy',
        test: () => {
          const h1Count = (htmlContent.match(/<h1[^>]*>/g) || []).length;
          return h1Count === 1; // Should have exactly one h1
        },
        description: 'Proper heading hierarchy (one h1 per page)'
      }
    ];
    
    console.log(`\nTesting ${file}:`);
    
    tests.forEach(test => {
      const passes = test.test();
      const status = passes ? '✅' : '❌';
      console.log(`  ${status} ${test.description}`);
      
      results.push({
        file: file,
        test: test.name,
        passes: passes,
        description: test.description
      });
    });
  });
  
  const passCount = results.filter(r => r.passes).length;
  console.log(`\nAccessibility Summary: ${passCount}/${results.length} tests passed`);
  
  return results;
}

// Generate test report
function generateReport(colorResults, breakpointResults, accessibilityResults) {
  const timestamp = new Date().toISOString();
  
  const report = {
    timestamp: timestamp,
    summary: {
      colorContrast: {
        total: colorResults.length,
        passed: colorResults.filter(r => r.passes).length
      },
      breakpoints: {
        total: breakpointResults.length,
        passed: breakpointResults.filter(r => r.found).length
      },
      accessibility: {
        total: accessibilityResults.length,
        passed: accessibilityResults.filter(r => r.passes).length
      }
    },
    details: {
      colorContrast: colorResults,
      breakpoints: breakpointResults,
      accessibility: accessibilityResults
    }
  };
  
  // Save report to file
  const reportPath = path.join(__dirname, '..', 'test-reports', `accessibility-report-${Date.now()}.json`);
  const reportsDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Test Report Generated');
  console.log('=' .repeat(50));
  console.log(`Report saved to: ${reportPath}`);
  console.log(`Color Contrast: ${report.summary.colorContrast.passed}/${report.summary.colorContrast.total} passed`);
  console.log(`Breakpoints: ${report.summary.breakpoints.passed}/${report.summary.breakpoints.total} passed`);
  console.log(`Accessibility: ${report.summary.accessibility.passed}/${report.summary.accessibility.total} passed`);
  
  const totalTests = report.summary.colorContrast.total + report.summary.breakpoints.total + report.summary.accessibility.total;
  const totalPassed = report.summary.colorContrast.passed + report.summary.breakpoints.passed + report.summary.accessibility.passed;
  const successRate = Math.round((totalPassed / totalTests) * 100);
  
  console.log(`\n🎯 Overall Success Rate: ${successRate}% (${totalPassed}/${totalTests})`);
  
  if (successRate < 95) {
    console.log('⚠️  Warning: Success rate below 95% target');
    process.exit(1);
  } else {
    console.log('✅ All tests meet quality standards!');
  }
  
  return report;
}

// Cross-browser compatibility check
function checkBrowserCompatibility() {
  console.log('\n🌐 Browser Compatibility Check');
  console.log('=' .repeat(50));
  
  const cssPath = path.join(__dirname, '../src/styles/main.css');
  
  if (!fs.existsSync(cssPath)) {
    console.log('❌ CSS file not found');
    return false;
  }
  
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  const browserTests = [
    {
      name: 'CSS Grid support',
      test: () => cssContent.includes('display: grid'),
      compatibility: 'IE 10+ (with prefixes), all modern browsers'
    },
    {
      name: 'Flexbox support', 
      test: () => cssContent.includes('display: flex'),
      compatibility: 'IE 11+, all modern browsers'
    },
    {
      name: 'CSS Custom Properties',
      test: () => cssContent.includes('var(--'),
      compatibility: 'IE not supported, all modern browsers'
    },
    {
      name: 'CSS Transitions',
      test: () => cssContent.includes('transition:'),
      compatibility: 'IE 10+, all modern browsers'
    },
    {
      name: 'CSS Transform',
      test: () => cssContent.includes('transform:'),
      compatibility: 'IE 9+, all modern browsers'
    }
  ];
  
  browserTests.forEach(test => {
    const uses = test.test();
    const status = uses ? '✅' : 'ℹ️';
    console.log(`${status} ${test.name.padEnd(25)} ${uses ? 'Used' : 'Not used'}`);
    if (uses) {
      console.log(`   📱 ${test.compatibility}`);
    }
  });
  
  return browserTests;
}

// Main execution
function main() {
  console.log('🧪 WPWeb Accessibility & Responsive Testing Suite');
  console.log('=' .repeat(60));
  console.log('Testing WCAG 2.1 AA compliance and responsive design...\n');
  
  try {
    const colorResults = testColorContrast();
    const breakpointResults = testResponsiveBreakpoints();
    const accessibilityResults = testAccessibilityFeatures();
    checkBrowserCompatibility();
    
    generateReport(colorResults, breakpointResults, accessibilityResults);
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  testColorContrast,
  testResponsiveBreakpoints,
  testAccessibilityFeatures,
  checkBrowserCompatibility,
  generateReport
};
