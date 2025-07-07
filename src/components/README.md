# Contact Form Component

A reusable, feature-rich contact form component with Formspree integration.

## Features

- ✅ **AJAX submission** to Formspree with no page reload
- ✅ **Real-time validation** with visual feedback
- ✅ **Success/error states** with styled messages
- ✅ **Analytics event hooks** for Google Analytics and custom tracking
- ✅ **Accessibility features** with ARIA attributes
- ✅ **URL parameter support** for service pre-selection
- ✅ **Mobile responsive** design
- ✅ **Customizable service options** per page type
- ✅ **Enhanced validation** including phone and URL validation
- ✅ **Loading states** during form submission
- ✅ **Hidden fields** for analytics and tracking

## Usage

### Basic Usage

```javascript
import { ContactForm } from './components/contact-form.js'

// Initialize contact form in a container
new ContactForm('#contact-form-container', {
  pageType: 'home' // or 'services'
})
```

### One-line Integration

```html
<!-- In your HTML -->
<div id="contact-form-container"></div>

<!-- In your JavaScript -->
<script type="module">
  import { ContactForm } from './components/contact-form.js'
  new ContactForm('#contact-form-container', { pageType: 'home' })
</script>
```

## Configuration Options

```javascript
new ContactForm('#container', {
  formspreeEndpoint: 'https://formspree.io/f/YOUR_FORM_ID', // Formspree endpoint
  pageType: 'home', // 'home' or 'services' - determines service options
  enableAnalytics: true, // Enable analytics tracking
  showSuccessMessage: true, // Show success message after submission
  customServiceOptions: null // Custom HTML for service options
})
```

## Page Types

### Home Page (`pageType: 'home'`)
Service options include pricing plans:
- Basic Plan ($99/month)
- Pro Plan ($299/month) 
- Premium Plan ($1199/month)
- Free Consultation

### Services Page (`pageType: 'services'`)
Service options include individual services:
- WordPress Maintenance
- Security Monitoring
- Daily Backups
- Performance Optimization
- WordPress Tweaks
- Expert Support
- SEO Optimization
- E-commerce Support
- Content Management
- Analytics & Reporting
- Comprehensive Package
- Free Consultation

## Form Fields

- **Name** (required) - Text input with character validation
- **Email** (required) - Email input with format validation
- **Phone** (optional) - Phone input with format validation
- **Website URL** (optional) - URL input with format validation
- **Service/Plan** (optional) - Dropdown based on page type
- **Message** (required) - Textarea with length validation (10-1000 chars)

## Hidden Fields (for analytics)

- `_subject` - Email subject line
- `_next` - Prevents Formspree redirect
- `_language` - Language setting
- `page_type` - Which page the form was submitted from
- `timestamp` - Submission timestamp
- `user_agent` - Browser user agent

## Analytics Events

The component automatically tracks the following events:

- `contact_form_viewed` - When form is displayed
- `form_submission_started` - When user submits form
- `form_submission_success` - When form is successfully submitted
- `form_submission_error` - When form submission fails
- `form_validation_failed` - When form validation fails

### Analytics Integration

```javascript
// Google Analytics 4
window.gtag('event', 'contact_form_viewed', {
  custom_parameter_1: 'home',
  value: 1
})

// Custom analytics callback
window.contactFormAnalytics = function(eventName, properties) {
  console.log('Contact form event:', eventName, properties)
  // Send to your analytics service
}
```

## URL Parameters

The component supports URL parameters for service pre-selection:

```
https://yoursite.com/services.html?service=wordpress-maintenance
```

This will automatically select "WordPress Maintenance" in the service dropdown and scroll to the form.

## Public Methods

```javascript
const contactForm = new ContactForm('#container')

// Reset the form
contactForm.reset()

// Clear all error messages
contactForm.clearAllErrors()

// Set a specific service
contactForm.setService('pro')

// Populate a field
contactForm.populateField('name', 'John Doe')
```

## Validation Rules

- **Name**: Required, 2+ characters, letters/spaces/hyphens/apostrophes only
- **Email**: Required, valid email format
- **Phone**: Optional, numbers/spaces/dashes/parentheses/plus signs only
- **Website**: Optional, valid URL format with http/https
- **Message**: Required, 10-1000 characters

## Styling

The component uses existing CSS classes from your stylesheet:
- `.contact-section`
- `.contact-form`
- `.form-group`
- `.error-message`
- `.btn`, `.btn-primary`, `.btn-full`

Success and error messages use inline styles for consistency.

## Error Handling

- **Network errors**: Shows user-friendly error message
- **Validation errors**: Real-time feedback with field highlighting
- **Formspree errors**: Displays specific error from Formspree response
- **Duplicate submissions**: Prevents multiple submissions

## Browser Support

- Modern browsers with ES6 modules support
- Requires `fetch` API support
- Graceful degradation for older browsers

## Development

For development mode, set `process.env.NODE_ENV = 'development'` to enable console logging of analytics events.

## Integration Examples

### Home Page Integration
```html
<div id="contact-form-container-home"></div>
<script type="module">
  import { ContactForm } from './components/contact-form.js'
  new ContactForm('#contact-form-container-home', { pageType: 'home' })
</script>
```

### Services Page Integration
```html
<div id="contact-form-container-services"></div>
<script type="module">
  import { ContactForm } from './components/contact-form.js'
  new ContactForm('#contact-form-container-services', { pageType: 'services' })
</script>
```

### Custom Service Options
```javascript
new ContactForm('#container', {
  pageType: 'custom',
  customServiceOptions: `
    <option value="option1">Custom Option 1</option>
    <option value="option2">Custom Option 2</option>
  `
})
```

## Formspree Setup

1. Create a Formspree account at https://formspree.io
2. Create a new form and get your endpoint URL
3. Update the `formspreeEndpoint` option in the component
4. Configure notification settings in Formspree dashboard

## Troubleshooting

- **Form not submitting**: Check Formspree endpoint URL
- **Validation not working**: Check browser console for JavaScript errors
- **Analytics not tracking**: Verify gtag is loaded and callback functions exist
- **Styling issues**: Ensure CSS classes are defined in your stylesheet
