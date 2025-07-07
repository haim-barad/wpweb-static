# Design System Documentation

## Wireframes

### Home Page Layout
```
+--------------------------------------------------+
|                   HEADER                         |
|  [Logo]              [Nav: Home | Services | Contact] |
+--------------------------------------------------+
|                  HERO SECTION                    |
|               [Large Title]                      |
|              [Subtitle Text]                     |
|                [CTA Button]                      |
+--------------------------------------------------+
|               FEATURED SECTIONS                  |
|  [Service 1]  |  [Service 2]  |  [Service 3]   |
|   [Image]     |   [Image]     |   [Image]       |
|   [Title]     |   [Title]     |   [Title]       |
|  [Description]|  [Description]|  [Description]  |
+--------------------------------------------------+
|                   FOOTER                         |
|        [Contact Info] | [Social Links]          |
+--------------------------------------------------+
```

### Services Page Layout
```
+--------------------------------------------------+
|                   HEADER                         |
|  [Logo]              [Nav: Home | Services | Contact] |
+--------------------------------------------------+
|              SERVICES HERO                       |
|               [Page Title]                       |
|              [Page Description]                  |
+--------------------------------------------------+
|               SERVICE DETAILS                    |
|  +--------------------------------------------+  |
|  |  [Service 1 - Detailed Description]       |  |
|  |  [Features List] | [Service Image]       |  |
|  +--------------------------------------------+  |
|  +--------------------------------------------+  |
|  |  [Service 2 - Detailed Description]       |  |
|  |  [Features List] | [Service Image]       |  |
|  +--------------------------------------------+  |
|  +--------------------------------------------+  |
|  |  [Service 3 - Detailed Description]       |  |
|  |  [Features List] | [Service Image]       |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
|                CONTACT CTA                       |
|             ["Get Started" Button]               |
+--------------------------------------------------+
|                   FOOTER                         |
|        [Contact Info] | [Social Links]          |
+--------------------------------------------------+
```

## Color Palette

### Primary Colors
- **Primary Blue:** `#2563EB` (rgb(37, 99, 235))
- **Primary Blue Light:** `#3B82F6` (rgb(59, 130, 246))
- **Primary Blue Dark:** `#1D4ED8` (rgb(29, 78, 216))

### Neutral Colors
- **White:** `#FFFFFF` (rgb(255, 255, 255))
- **Gray 50:** `#F9FAFB` (rgb(249, 250, 251))
- **Gray 100:** `#F3F4F6` (rgb(243, 244, 246))
- **Gray 200:** `#E5E7EB` (rgb(229, 231, 235))
- **Gray 300:** `#D1D5DB` (rgb(209, 213, 219))
- **Gray 400:** `#9CA3AF` (rgb(156, 163, 175))
- **Gray 500:** `#6B7280` (rgb(107, 114, 128))
- **Gray 600:** `#4B5563` (rgb(75, 85, 99))
- **Gray 700:** `#374151` (rgb(55, 65, 81))
- **Gray 800:** `#1F2937` (rgb(31, 41, 55))
- **Gray 900:** `#111827` (rgb(17, 24, 39))

### Accent Colors
- **Accent Orange:** `#F59E0B` (rgb(245, 158, 11))
- **Accent Orange Light:** `#FBBF24` (rgb(251, 191, 36))
- **Accent Orange Dark:** `#D97706` (rgb(217, 119, 6))

### Semantic Colors
- **Success:** `#10B981` (rgb(16, 185, 129))
- **Warning:** `#F59E0B` (rgb(245, 158, 11))
- **Error:** `#EF4444` (rgb(239, 68, 68))
- **Info:** `#3B82F6` (rgb(59, 130, 246))

## Typography

### Google Fonts
- **Headings:** Inter (weights: 400, 500, 600, 700)
- **Body Text:** Roboto (weights: 300, 400, 500, 700)

### Font Sizes
- **H1:** 2.5rem (40px) - Inter 600
- **H2:** 2rem (32px) - Inter 600
- **H3:** 1.5rem (24px) - Inter 600
- **H4:** 1.25rem (20px) - Inter 500
- **H5:** 1.125rem (18px) - Inter 500
- **H6:** 1rem (16px) - Inter 500
- **Body Large:** 1.125rem (18px) - Roboto 400
- **Body:** 1rem (16px) - Roboto 400
- **Body Small:** 0.875rem (14px) - Roboto 400
- **Caption:** 0.75rem (12px) - Roboto 400

### Line Heights
- **Headings:** 1.25
- **Body Text:** 1.6
- **Captions:** 1.4

## Spacing Scale

- **xs:** 0.25rem (4px)
- **sm:** 0.5rem (8px)
- **md:** 1rem (16px)
- **lg:** 1.5rem (24px)
- **xl:** 2rem (32px)
- **2xl:** 3rem (48px)
- **3xl:** 4rem (64px)
- **4xl:** 6rem (96px)

## Border Radius

- **Small:** 0.25rem (4px)
- **Medium:** 0.5rem (8px)
- **Large:** 1rem (16px)
- **Full:** 9999px (circular)

## Shadows

- **Small:** `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **Medium:** `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
- **Large:** `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
- **XL:** `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`

## Breakpoints

- **Mobile:** 320px - 768px
- **Tablet:** 768px - 1024px
- **Desktop:** 1024px - 1440px
- **Large Desktop:** 1440px+

## Component Guidelines

### Buttons
- **Primary:** Blue background, white text, medium border radius
- **Secondary:** White background, blue border, blue text
- **Accent:** Orange background, white text, medium border radius
- **Padding:** 0.75rem 1.5rem
- **Font:** Inter 500, 1rem

### Cards
- **Background:** White
- **Border:** 1px solid Gray 200
- **Border Radius:** Large (1rem)
- **Shadow:** Medium
- **Padding:** 1.5rem

### Navigation
- **Background:** White with subtle shadow
- **Link Color:** Gray 700
- **Link Hover:** Primary Blue
- **Active Link:** Primary Blue
- **Font:** Inter 500, 1rem

## CSS Custom Properties

```css
:root {
  /* Colors */
  --color-primary: #2563EB;
  --color-primary-light: #3B82F6;
  --color-primary-dark: #1D4ED8;
  --color-accent: #F59E0B;
  --color-white: #FFFFFF;
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;
  
  /* Typography */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Roboto', sans-serif;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;
  --spacing-4xl: 6rem;
  
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;
}
```

## Usage Guidelines

1. **Consistency:** Use these design tokens consistently across all components and pages
2. **Accessibility:** Ensure color contrast ratios meet WCAG 2.1 AA standards
3. **Responsive Design:** Use the defined breakpoints for responsive layouts
4. **Typography Hierarchy:** Maintain clear visual hierarchy using the defined font sizes
5. **Spacing:** Use the spacing scale for consistent margins and padding
6. **Colors:** Use semantic colors for their intended purposes (success, warning, error, info)

## Implementation

### Google Fonts Import
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
```

### CSS Reset Recommendations
```css
* {
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-gray-800);
  margin: 0;
  padding: 0;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.25;
  margin-bottom: var(--spacing-md);
}
```

