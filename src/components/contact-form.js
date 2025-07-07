/**
 * Reusable Contact Form Component with Formspree Integration
 * 
 * Features:
 * - AJAX submission to Formspree
 * - Client-side validation with real-time feedback
 * - Success/error states with visual feedback
 * - Analytics event hooks
 * - Accessibility features
 * - Customizable service options per page
 * 
 * Usage:
 * import { ContactForm } from './components/contact-form.js'
 * new ContactForm('#contact', { pageType: 'home' })
 */

export class ContactForm {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector)
    this.options = {
      formspreeEndpoint: 'https://formspree.io/f/movwzokj',
      pageType: 'home', // 'home' or 'services'
      enableAnalytics: true,
      showSuccessMessage: true,
      customServiceOptions: null,
      ...options
    }
    
    this.form = null
    this.isSubmitting = false
    this.init()
  }

  init() {
    if (!this.container) {
      console.warn('Contact form container not found')
      return
    }

    this.render()
    this.attachEventListeners()
    this.initAnalytics()
  }

  render() {
    const serviceOptions = this.getServiceOptions()
    
    const formHTML = `
      <section class="contact-section" id="contact">
        <h2 data-aos="fade-up">Get Started Today</h2>
        <p class="contact-subtitle" data-aos="fade-up" data-aos-delay="100">
          Ready to secure and optimize your WordPress site? Let's discuss your needs.
        </p>
        <div class="contact-container">
          <form class="contact-form" data-aos="fade-up" data-aos-delay="200" 
                action="${this.options.formspreeEndpoint}" method="POST" 
                role="form" aria-label="Contact form">
            
            <div class="form-group">
              <label for="name">Name *</label>
              <input type="text" id="name" name="name" required aria-describedby="name-error">
              <span class="error-message" id="name-error"></span>
            </div>
            
            <div class="form-group">
              <label for="email">Email *</label>
              <input type="email" id="email" name="email" required aria-describedby="email-error">
              <span class="error-message" id="email-error"></span>
            </div>
            
            <div class="form-group">
              <label for="phone">Phone</label>
              <input type="tel" id="phone" name="phone" aria-describedby="phone-error" 
                     placeholder="(555) 123-4567">
              <span class="error-message" id="phone-error"></span>
            </div>
            
            <div class="form-group">
              <label for="website">Website URL</label>
              <input type="url" id="website" name="website" placeholder="https://yoursite.com" 
                     aria-describedby="website-error">
              <span class="error-message" id="website-error"></span>
            </div>
            
            <div class="form-group">
              <label for="service">${this.options.pageType === 'services' ? 'Service Interested In' : 'Plan Interested In'}</label>
              <select id="service" name="service" aria-describedby="service-error">
                <option value="">Select ${this.options.pageType === 'services' ? 'a service' : 'a plan'}...</option>
                ${serviceOptions}
              </select>
              <span class="error-message" id="service-error"></span>
            </div>
            
            <div class="form-group">
              <label for="message">Tell us about your needs *</label>
              <textarea id="message" name="message" rows="5" required aria-describedby="message-error" 
                        placeholder="Describe your current challenges or what you're looking for help with..."></textarea>
              <span class="error-message" id="message-error"></span>
            </div>

            <!-- Hidden fields for analytics and tracking -->
            <input type="hidden" name="_subject" value="New Contact Form Submission from WPWeb">
            <input type="hidden" name="_next" value="false">
            <input type="hidden" name="_language" value="en">
            <input type="hidden" name="page_type" value="${this.options.pageType}">
            <input type="hidden" name="timestamp" value="">
            <input type="hidden" name="user_agent" value="">
            
            <button type="submit" class="btn btn-primary btn-full" aria-describedby="submit-help">
              <span class="btn-text">Get Started</span>
              <i class="fas fa-paper-plane" aria-hidden="true"></i>
            </button>
            <p id="submit-help" class="sr-only">Submit the form to get in touch with our team</p>
          </form>
        </div>
      </section>
    `

    this.container.innerHTML = formHTML
    this.form = this.container.querySelector('.contact-form')
  }

  getServiceOptions() {
    if (this.options.customServiceOptions) {
      return this.options.customServiceOptions
    }

    if (this.options.pageType === 'services') {
      return `
        <option value="wordpress-maintenance">WordPress Maintenance</option>
        <option value="security-monitoring">Security Monitoring</option>
        <option value="daily-backups">Daily Backups</option>
        <option value="performance-optimization">Performance Optimization</option>
        <option value="wordpress-tweaks">WordPress Tweaks</option>
        <option value="expert-support">Expert Support</option>
        <option value="seo-optimization">SEO Optimization</option>
        <option value="ecommerce-support">E-commerce Support</option>
        <option value="content-management">Content Management</option>
        <option value="analytics-reporting">Analytics & Reporting</option>
        <option value="comprehensive-package">Comprehensive Package</option>
        <option value="consultation">Free Consultation</option>
      `
    } else {
      // Home page options (pricing plans)
      return `
        <option value="basic">Basic Plan ($99/month)</option>
        <option value="pro">Pro Plan ($299/month)</option>
        <option value="premium">Premium Plan ($1199/month)</option>
        <option value="consultation">Free Consultation</option>
      `
    }
  }

  attachEventListeners() {
    if (!this.form) return

    // Form submission
    this.form.addEventListener('submit', this.handleSubmit.bind(this))
    
    // Real-time validation
    const inputs = this.form.querySelectorAll('input, select, textarea')
    inputs.forEach(input => {
      input.addEventListener('blur', this.validateField.bind(this))
      input.addEventListener('input', this.clearError.bind(this))
    })

    // Pre-populate hidden fields
    this.populateHiddenFields()

    // Handle URL parameters for service pre-selection
    this.handleServicePreSelection()
  }

  populateHiddenFields() {
    const timestampField = this.form.querySelector('input[name="timestamp"]')
    const userAgentField = this.form.querySelector('input[name="user_agent"]')
    
    if (timestampField) {
      timestampField.value = new Date().toISOString()
    }
    
    if (userAgentField) {
      userAgentField.value = navigator.userAgent
    }
  }

  handleServicePreSelection() {
    const urlParams = new URLSearchParams(window.location.search)
    const selectedService = urlParams.get('service')
    const serviceSelect = this.form.querySelector('#service')
    
    if (selectedService && serviceSelect) {
      // Find matching option
      const option = serviceSelect.querySelector(`option[value="${selectedService}"]`)
      if (option) {
        serviceSelect.value = selectedService
        serviceSelect.dispatchEvent(new Event('change'))
        
        // Scroll to form after a short delay
        setTimeout(() => {
          this.form.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 500)
      }
    }
  }

  validateField(event) {
    const field = event.target
    const fieldName = field.name
    const value = field.value.trim()
    const errorElement = this.form.querySelector(`#${fieldName}-error`)

    let isValid = true
    let errorMessage = ''

    switch (fieldName) {
      case 'name':
        if (!value) {
          isValid = false
          errorMessage = 'Name is required'
        } else if (value.length < 2) {
          isValid = false
          errorMessage = 'Name must be at least 2 characters'
        } else if (!/^[a-zA-Z\s\-']+$/.test(value)) {
          isValid = false
          errorMessage = 'Name can only contain letters, spaces, hyphens, and apostrophes'
        }
        break

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!value) {
          isValid = false
          errorMessage = 'Email is required'
        } else if (!emailRegex.test(value)) {
          isValid = false
          errorMessage = 'Please enter a valid email address'
        }
        break

      case 'phone':
        if (value && !/^[\d\s\-\+\(\)\.]+$/.test(value)) {
          isValid = false
          errorMessage = 'Please enter a valid phone number'
        }
        break

      case 'website':
        if (value && !/^https?:\/\/.+\..+/.test(value)) {
          isValid = false
          errorMessage = 'Please enter a valid website URL (including http:// or https://)'
        }
        break

      case 'message':
        if (!value) {
          isValid = false
          errorMessage = 'Message is required'
        } else if (value.length < 10) {
          isValid = false
          errorMessage = 'Message must be at least 10 characters'
        } else if (value.length > 1000) {
          isValid = false
          errorMessage = 'Message must be less than 1000 characters'
        }
        break
    }

    if (errorElement) {
      errorElement.textContent = errorMessage
      field.style.borderColor = isValid ? '' : '#dc3545'
    }

    return isValid
  }

  clearError(event) {
    const field = event.target
    const fieldName = field.name
    const errorElement = this.form.querySelector(`#${fieldName}-error`)
    
    if (errorElement && errorElement.textContent) {
      errorElement.textContent = ''
      field.style.borderColor = ''
    }
  }

  async handleSubmit(event) {
    event.preventDefault()
    
    if (this.isSubmitting) return
    
    // Validate all required fields
    const requiredInputs = this.form.querySelectorAll('input[required], textarea[required]')
    let isFormValid = true

    requiredInputs.forEach(input => {
      const isFieldValid = this.validateField({ target: input })
      if (!isFieldValid) {
        isFormValid = false
      }
    })

    // Validate optional fields that have values
    const optionalInputs = this.form.querySelectorAll('input:not([required]), select')
    optionalInputs.forEach(input => {
      if (input.value.trim()) {
        this.validateField({ target: input })
      }
    })

    if (!isFormValid) {
      // Focus on first invalid field
      const firstError = this.form.querySelector('.error-message:not(:empty)')
      if (firstError) {
        const invalidField = firstError.previousElementSibling
        invalidField.focus()
      }
      
      // Track validation failure
      this.trackEvent('form_validation_failed', {
        page_type: this.options.pageType
      })
      return
    }

    await this.submitForm()
  }

  async submitForm() {
    const submitButton = this.form.querySelector('button[type="submit"]')
    const originalText = submitButton.querySelector('.btn-text').textContent
    const originalIcon = submitButton.querySelector('i').className
    
    this.isSubmitting = true
    
    // Show loading state
    submitButton.disabled = true
    submitButton.querySelector('.btn-text').textContent = 'Sending...'
    submitButton.querySelector('i').className = 'fas fa-spinner fa-spin'
    
    try {
      // Update timestamp before submission
      const timestampField = this.form.querySelector('input[name="timestamp"]')
      if (timestampField) {
        timestampField.value = new Date().toISOString()
      }

      const formData = new FormData(this.form)
      
      // Track form submission attempt
      this.trackEvent('form_submission_started', {
        page_type: this.options.pageType,
        service_selected: formData.get('service')
      })
      
      const response = await fetch(this.form.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        this.showSuccess()
        this.form.reset()
        
        // Track successful submission
        this.trackEvent('form_submission_success', {
          page_type: this.options.pageType,
          service_selected: formData.get('service')
        })
        
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Form submission failed')
      }
      
    } catch (error) {
      console.error('Form submission error:', error)
      this.showError(error.message)
      
      // Track submission error
      this.trackEvent('form_submission_error', {
        page_type: this.options.pageType,
        error_message: error.message
      })
      
    } finally {
      this.isSubmitting = false
      
      // Reset button state
      submitButton.disabled = false
      submitButton.querySelector('.btn-text').textContent = originalText
      submitButton.querySelector('i').className = originalIcon
    }
  }

  showSuccess() {
    const existingMessage = this.form.querySelector('.status-message')
    if (existingMessage) existingMessage.remove()

    const successMessage = document.createElement('div')
    successMessage.className = 'status-message success-message'
    successMessage.innerHTML = `
      <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 6px; margin-top: 1rem; border: 1px solid #c3e6cb;">
        <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
        <strong>Thank you!</strong> Your message has been sent successfully. We'll get back to you within 24 hours.
      </div>
    `
    
    this.form.appendChild(successMessage)
    
    // Scroll success message into view
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' })
    
    // Remove message after 10 seconds
    setTimeout(() => successMessage.remove(), 10000)
  }

  showError(errorMessage = 'Sorry, there was an error sending your message. Please try again.') {
    const existingMessage = this.form.querySelector('.status-message')
    if (existingMessage) existingMessage.remove()

    const errorMessageElement = document.createElement('div')
    errorMessageElement.className = 'status-message error-message'
    errorMessageElement.innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 6px; margin-top: 1rem; border: 1px solid #f5c6cb;">
        <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
        <strong>Error:</strong> ${errorMessage}
      </div>
    `
    
    this.form.appendChild(errorMessageElement)
    
    // Scroll error message into view
    errorMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    
    // Remove message after 8 seconds
    setTimeout(() => errorMessageElement.remove(), 8000)
  }

  // Analytics integration
  initAnalytics() {
    if (!this.options.enableAnalytics) return

    // Track form view
    this.trackEvent('contact_form_viewed', {
      page_type: this.options.pageType,
      timestamp: new Date().toISOString()
    })
  }

  trackEvent(eventName, properties = {}) {
    if (!this.options.enableAnalytics) return

    // Google Analytics 4 integration
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        custom_parameter_1: properties.page_type,
        custom_parameter_2: properties.service_selected,
        value: 1
      })
    }

    // Generic analytics hook for other services
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track(eventName, properties)
    }

    // Custom analytics callback
    if (typeof window.contactFormAnalytics === 'function') {
      window.contactFormAnalytics(eventName, properties)
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Contact Form Analytics Event:', eventName, properties)
    }
  }

  // Public methods for external control
  reset() {
    if (this.form) {
      this.form.reset()
      this.clearAllErrors()
    }
  }

  clearAllErrors() {
    const errorElements = this.form.querySelectorAll('.error-message')
    const inputs = this.form.querySelectorAll('input, select, textarea')
    
    errorElements.forEach(el => el.textContent = '')
    inputs.forEach(input => input.style.borderColor = '')
  }

  setService(serviceValue) {
    const serviceSelect = this.form.querySelector('#service')
    if (serviceSelect) {
      serviceSelect.value = serviceValue
    }
  }

  populateField(fieldName, value) {
    const field = this.form.querySelector(`[name="${fieldName}"]`)
    if (field) {
      field.value = value
    }
  }
}

// Static helper method for easy integration
ContactForm.create = function(containerSelector, options = {}) {
  return new ContactForm(containerSelector, options)
}

// Export for both ES6 modules and global usage
if (typeof window !== 'undefined') {
  window.ContactForm = ContactForm
}
