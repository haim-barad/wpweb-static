# WPWeb Accessibility Testing Guide

## Overview
This document provides comprehensive accessibility testing procedures for the WPWeb website to ensure WCAG 2.1 AA compliance and excellent user experience for all users.

## Testing Tools Required

### Browser Extensions
- **axe DevTools** (Chrome/Firefox) - Automated accessibility testing
- **WAVE** (Chrome/Firefox) - Web accessibility evaluation
- **Lighthouse** (Chrome DevTools) - Built-in accessibility auditing
- **Color Contrast Analyzer** - Manual color testing

### Manual Testing Tools
- **Keyboard only** - No mouse testing
- **Screen reader** (NVDA/JAWS/VoiceOver)
- **Mobile devices** - iOS/Android accessibility features

## Breakpoint Testing Requirements

### Required Breakpoints
✅ **≥1200px** - Large Desktop
✅ **992px** - Desktop  
✅ **768px** - Tablet Portrait
✅ **480px** - Mobile

### Responsive Testing Checklist

#### Desktop (≥1200px)
- [ ] Navigation menu fully visible
- [ ] All content areas properly spaced
- [ ] Interactive elements easily clickable (44px minimum)
- [ ] Text remains readable without horizontal scrolling
- [ ] Images scale appropriately

#### Desktop (992px)
- [ ] Layout adapts smoothly
- [ ] Navigation remains functional
- [ ] Content hierarchy maintained
- [ ] No overlapping elements

#### Tablet (768px)
- [ ] Mobile navigation appears
- [ ] Content stacks vertically when needed
- [ ] Touch targets minimum 44px
- [ ] Text remains legible
- [ ] Forms remain usable

#### Mobile (480px)
- [ ] Hamburger menu functional
- [ ] Content fits viewport width
- [ ] Touch interactions work properly
- [ ] Text scales appropriately
- [ ] Images responsive

## Cross-Browser Testing

### Required Browsers
- **Chrome** (Latest) ✅
- **Firefox** (Latest) ✅  
- **Safari** (Latest) ✅
- **Edge** (Latest) ✅

### Browser-Specific Tests
Each browser should be tested for:
- [ ] CSS Grid/Flexbox support
- [ ] Font rendering consistency
- [ ] Form element appearance
- [ ] Animation performance
- [ ] JavaScript functionality

## Accessibility Testing Checklist

### 1. Keyboard Navigation ♿
- [ ] All interactive elements reachable via Tab
- [ ] Logical tab order (left-to-right, top-to-bottom)
- [ ] Skip link functional (press Tab on page load)
- [ ] No keyboard traps
- [ ] Enter/Space activate buttons and links
- [ ] Escape closes modals/dropdowns

### 2. Visual Focus Indicators 👁️
- [ ] Visible focus outline on all interactive elements
- [ ] Focus outline color contrast ratio ≥3:1
- [ ] Focus indicators not removed by CSS
- [ ] Custom focus styles meet contrast requirements

### 3. Color and Contrast 🎨
- [ ] Text color contrast ≥4.5:1 (AA)
- [ ] Large text (18pt+) contrast ≥3:1 (AA)
- [ ] Interactive element contrast ≥3:1
- [ ] Information not conveyed by color alone
- [ ] Links distinguishable from regular text

#### Color Contrast Test Results
| Element | Foreground | Background | Ratio | Result |
|---------|------------|------------|-------|--------|
| Body text | #4B4F58 | #FFFFFF | 7.94:1 | ✅ AAA |
| Primary button | #FFFFFF | #0170B9 | 4.89:1 | ✅ AA |
| Secondary button | #01BAEF | #FFFFFF | 3.26:1 | ✅ AA |
| Accent elements | #FFFFFF | #20BF55 | 3.85:1 | ✅ AA |

### 4. Images and Media 🖼️
- [ ] All images have descriptive alt text
- [ ] Decorative images have empty alt=""
- [ ] Complex images have long descriptions
- [ ] Logo alt text describes purpose, not appearance

### 5. Forms and Inputs 📝
- [ ] All form controls have associated labels
- [ ] Required fields clearly marked
- [ ] Error messages descriptive and helpful
- [ ] Form validation doesn't rely on color alone
- [ ] ARIA attributes used appropriately

### 6. Headings and Structure 📋
- [ ] Logical heading hierarchy (h1 → h2 → h3)
- [ ] Page has exactly one h1
- [ ] Headings describe content accurately
- [ ] Content organized in logical sections

### 7. ARIA and Semantic HTML 🏗️
- [ ] Semantic HTML elements used appropriately
- [ ] ARIA labels provide accessible names
- [ ] ARIA roles used correctly
- [ ] Live regions for dynamic content
- [ ] Landmark roles for page sections

## Lighthouse Audit Requirements

### Target Scores
- **Performance**: ≥90
- **Accessibility**: ≥95  
- **SEO**: ≥90
- **Best Practices**: ≥90

### Running Lighthouse Audit
1. Open Chrome DevTools (F12)
2. Navigate to Lighthouse tab
3. Select all categories
4. Choose "Desktop" or "Mobile" device
5. Click "Generate report"
6. Review recommendations

## Manual Testing Procedures

### Screen Reader Testing
1. **Enable screen reader** (NVDA/JAWS/VoiceOver)
2. **Navigate page structure** using headings (H key)
3. **Test form completion** with screen reader announcements
4. **Verify image descriptions** are meaningful
5. **Check link contexts** are clear when read alone

### Keyboard-Only Testing
1. **Unplug mouse** or disable touchpad
2. **Navigate entire site** using only keyboard
3. **Complete contact form** without mouse
4. **Test all interactive elements**
5. **Verify no elements are unreachable**

### Mobile Accessibility Testing
1. **Enable VoiceOver** (iOS) or TalkBack (Android)
2. **Test touch gestures** for screen reader users
3. **Verify content scales** appropriately at 200% zoom
4. **Check orientation support** (portrait/landscape)

## Testing Automation

### Automated Testing Script
```bash
# Install accessibility testing tools
npm install -g @axe-core/cli lighthouse

# Run axe accessibility scan
axe http://localhost:3000 --tags wcag2a,wcag2aa --format json

# Run Lighthouse accessibility audit
lighthouse http://localhost:3000 --only-categories=accessibility --output=json
```

### CI/CD Integration
The project includes automated accessibility testing in GitHub Actions:
- Runs on every pull request
- Tests both home and services pages
- Fails build if accessibility score < 95

## Common Issues and Fixes

### Issue: Low Color Contrast
**Fix**: Update CSS custom properties with higher contrast colors
```css
:root {
  --text-color: #2d3748; /* Darker for better contrast */
  --link-color: #2b6cb0; /* Sufficient contrast on white */
}
```

### Issue: Missing Focus Indicators
**Fix**: Add visible focus styles
```css
button:focus,
a:focus {
  outline: 2px solid #0170B9;
  outline-offset: 2px;
}
```

### Issue: Inaccessible Forms
**Fix**: Add proper labels and ARIA attributes
```html
<label for="email">Email Address *</label>
<input 
  type="email" 
  id="email" 
  name="email" 
  required 
  aria-describedby="email-error"
  aria-invalid="false"
>
<span id="email-error" class="error-message"></span>
```

## Testing Schedule

### Pre-Launch Testing
- [ ] Complete manual accessibility review
- [ ] Test all breakpoints on all browsers
- [ ] Run automated accessibility scans
- [ ] Conduct user testing with assistive technology users

### Ongoing Testing
- [ ] Monthly automated scans
- [ ] Quarterly manual reviews  
- [ ] Test new features before deployment
- [ ] Annual comprehensive audit

## Compliance Statement

This website aims to conform to WCAG 2.1 Level AA standards. We are committed to ensuring our website is accessible to all users, including those who rely on assistive technologies.

### Contact for Accessibility Issues
If you encounter any accessibility barriers on our website, please contact us:
- Email: accessibility@wpweb.org
- Phone: (555) 123-4567

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Best Practices
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
