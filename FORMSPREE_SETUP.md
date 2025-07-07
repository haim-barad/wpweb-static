# Formspree Setup Instructions

This guide will help you set up the contact form to work with your Formspree account.

## Account Details
- **Email**: haim@wpweb.org
- **Password**: vG^xUHLK4RbY9WaJ
- **Account Type**: Free tier

## Setup Steps

### 1. Login to Formspree
1. Go to [https://formspree.io/login](https://formspree.io/login)
2. Login with the credentials above

### 2. Create a New Form
1. Click "New Form" or "+" button
2. Give your form a name: "WP Web Static Contact Form"
3. Copy the form endpoint that looks like: `https://formspree.io/f/XXXXXXXX`

### 3. Update the Component Configuration
1. Open `src/components/contact-form.js`
2. Find line 21 with: `formspreeEndpoint: 'https://formspree.io/f/mpwqeqkp'`
3. Replace `mpwqeqkp` with your actual form ID from step 2

**Note**: The contact forms are now implemented as reusable components that are automatically integrated into both pages.

### 4. Configure Form Settings (Optional)
In your Formspree dashboard, you can configure:
- **Notification emails**: Where form submissions are sent
- **Reply-to address**: Set to the form submitter's email
- **Thank you page**: Redirect after successful submission
- **Spam protection**: Enable reCAPTCHA if needed

### 5. Test the Form
1. Build and serve your website
2. Fill out and submit the contact form
3. Check your email for the form submission
4. Verify the form appears in your Formspree dashboard

## Form Fields Included
- **Name** (required) - Enhanced validation for proper names
- **Email** (required) - Email format validation
- **Phone** (optional) - Phone number format validation
- **Website URL** (optional) - URL format validation
- **Service/Plan** (dropdown selection) - Context-aware options based on page
- **Message** (required) - Length validation (10-1000 characters)

### Service Options by Page
**Home Page**: Pricing plans (Basic, Pro, Premium, Free Consultation)
**Services Page**: Individual services (WordPress Maintenance, Security, etc.)

## Features
- ✅ **Reusable component** - One line integration on any page
- ✅ **AJAX submission** - No page reload required
- ✅ **Client-side validation** with enhanced rules
- ✅ **Real-time error messaging** with field highlighting
- ✅ **Loading states** during submission
- ✅ **Success/error feedback** with styled messages
- ✅ **Analytics integration** - Google Analytics and custom tracking
- ✅ **URL parameter support** for service pre-selection
- ✅ **ARIA accessibility attributes**
- ✅ **Responsive design**
- ✅ **Phone field** with validation
- ✅ **Enhanced validation** (name patterns, URL validation, message length)

## Free Tier Limitations
- 50 submissions per month
- Formspree branding on emails
- Basic spam protection

## Component Integration

The contact form is now a reusable component located at `src/components/contact-form.js`. Integration is done with a single line:

### Home Page Integration
```javascript
new ContactForm('#contact-form-container-home', { pageType: 'home' })
```

### Services Page Integration  
```javascript
new ContactForm('#contact-form-container-services', { pageType: 'services' })
```

### Custom Integration
```javascript
new ContactForm('#your-container', {
  pageType: 'custom',
  formspreeEndpoint: 'https://formspree.io/f/YOUR_FORM_ID',
  enableAnalytics: true,
  customServiceOptions: '<option value="custom">Custom Option</option>'
})
```

## Analytics Integration

The component automatically tracks form interactions:
- Form views
- Submission attempts
- Successful submissions
- Validation failures
- Submission errors

Events are sent to Google Analytics (if gtag is available) and can be customized with callbacks.

## Advanced Features

### URL Parameter Pre-selection
Add URL parameters to pre-select services:
```
https://yoursite.com/services.html?service=wordpress-maintenance
```

### Analytics Callbacks
```javascript
// Custom analytics integration
window.contactFormAnalytics = function(eventName, properties) {
  // Send to your analytics service
  console.log('Contact form event:', eventName, properties)
}
```

### Public Methods
```javascript
const form = new ContactForm('#container')
form.reset() // Reset the form
form.setService('pro') // Pre-select a service
form.populateField('name', 'John Doe') // Pre-populate fields
```

## Troubleshooting
1. **Form not submitting**: Check the formspreeEndpoint in `contact-form.js`
2. **Not receiving emails**: Verify email settings in Formspree dashboard
3. **Validation errors**: Check browser console for JavaScript errors
4. **Component not loading**: Ensure ES6 modules are supported
5. **Analytics not tracking**: Verify gtag is loaded and callbacks are defined
6. **Styling issues**: Ensure CSS classes are defined in your main stylesheet

## Testing the Form Locally
When testing locally, the form will still submit to Formspree. Make sure to:
1. Use a local web server (not file:// protocol)
2. Test with real email addresses
3. Check spam folders for form submissions
