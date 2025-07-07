// Import AOS for scroll animations
import AOS from 'aos'
// Import reusable contact form component
import { ContactForm } from '../components/contact-form.js'

// Sticky CTA Banner functionality
class StickyCTA {
  constructor() {
    this.banner = document.getElementById('sticky-cta')
    this.closeBtn = document.getElementById('sticky-cta-close')
    this.isVisible = false
    this.scrollThreshold = 800
    this.init()
  }

  init() {
    if (!this.banner) return

    // Close button functionality
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', this.closeBanner.bind(this))
    }

    // Show/hide on scroll
    window.addEventListener('scroll', this.handleScroll.bind(this))

    // Check if banner was previously closed
    if (localStorage.getItem('ctaBannerClosed') === 'true') {
      this.banner.style.display = 'none'
      return
    }
  }

  handleScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop

    if (scrollPosition > this.scrollThreshold && !this.isVisible) {
      this.showBanner()
    } else if (scrollPosition <= this.scrollThreshold && this.isVisible) {
      this.hideBanner()
    }
  }

  showBanner() {
    if (this.banner.style.display === 'none') return
    
    this.banner.classList.add('show')
    this.isVisible = true
    
    // Adjust body padding to account for banner
    document.body.style.paddingTop = this.banner.offsetHeight + 'px'
  }

  hideBanner() {
    this.banner.classList.remove('show')
    this.isVisible = false
    
    // Remove body padding
    document.body.style.paddingTop = '0'
  }

  closeBanner() {
    this.banner.style.display = 'none'
    this.isVisible = false
    
    // Remove body padding
    document.body.style.paddingTop = '0'
    
    // Remember user's preference
    localStorage.setItem('ctaBannerClosed', 'true')
  }
}

// Enhanced service card interactions
class ServiceCardEnhancer {
  constructor() {
    this.cards = document.querySelectorAll('.service-card, .additional-service-card')
    this.init()
  }

  init() {
    this.cards.forEach(card => {
      card.addEventListener('mouseenter', this.handleMouseEnter.bind(this))
      card.addEventListener('mouseleave', this.handleMouseLeave.bind(this))
      card.addEventListener('click', this.handleCardClick.bind(this))
    })
  }

  handleMouseEnter(event) {
    const card = event.currentTarget
    const icon = card.querySelector('.service-icon, .additional-service-icon')
    
    if (icon) {
      // Add a subtle pulse effect
      icon.style.animation = 'pulse 1.5s ease-in-out infinite'
    }

    // Highlight related cards
    this.highlightRelatedCards(card)
  }

  handleMouseLeave(event) {
    const card = event.currentTarget
    const icon = card.querySelector('.service-icon, .additional-service-icon')
    
    if (icon) {
      // Remove pulse effect
      icon.style.animation = ''
    }

    // Remove highlighting
    this.removeHighlighting()
  }

  handleCardClick(event) {
    const card = event.currentTarget
    const button = card.querySelector('.btn')
    
    if (button && event.target !== button) {
      // If clicking on card but not button, trigger button click
      button.click()
    }
  }

  highlightRelatedCards(activeCard) {
    // Simple implementation - could be enhanced with actual service relationships
    this.cards.forEach(card => {
      if (card !== activeCard) {
        card.style.opacity = '0.7'
        card.style.transform = 'scale(0.98)'
      }
    })
  }

  removeHighlighting() {
    this.cards.forEach(card => {
      card.style.opacity = ''
      card.style.transform = ''
    })
  }
}

// Process steps animation
class ProcessStepsAnimator {
  constructor() {
    this.steps = document.querySelectorAll('.process-step')
    this.init()
  }

  init() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('animate-in')
              this.animateStep(entry.target)
            }, index * 200)
          }
        })
      },
      { threshold: 0.3 }
    )

    this.steps.forEach(step => observer.observe(step))
  }

  animateStep(step) {
    const stepNumber = step.querySelector('.step-number')
    if (stepNumber) {
      // Add a counting animation
      const targetNumber = stepNumber.textContent
      let currentNumber = 0
      const duration = 1000
      const increment = targetNumber / (duration / 50)

      const counter = setInterval(() => {
        currentNumber += increment
        if (currentNumber >= targetNumber) {
          currentNumber = targetNumber
          clearInterval(counter)
        }
        stepNumber.textContent = Math.floor(currentNumber)
      }, 50)
    }
  }
}

// Stats counter animation
class StatsCounter {
  constructor() {
    this.stats = document.querySelectorAll('.stat-number')
    this.init()
  }

  init() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateCounter(entry.target)
          }
        })
      },
      { threshold: 0.5 }
    )

    this.stats.forEach(stat => observer.observe(stat))
  }

  animateCounter(element) {
    const target = element.textContent
    const isPercentage = target.includes('%')
    const hasPlus = target.includes('+')
    const numericValue = parseFloat(target.replace(/[^0-9.]/g, ''))
    
    let current = 0
    const duration = 2000
    const increment = numericValue / (duration / 50)

    const counter = setInterval(() => {
      current += increment
      if (current >= numericValue) {
        current = numericValue
        clearInterval(counter)
      }

      let displayValue = Math.floor(current)
      if (target.includes('.')) {
        displayValue = current.toFixed(1)
      }

      element.textContent = displayValue + (isPercentage ? '%' : '') + (hasPlus ? '+' : '')
    }, 50)
  }
}

// Initialize Contact Form Component for Services Page
function initServicesContactForm() {
  // Check if we're on the services page
  const servicesContainer = document.getElementById('contact-form-container-services')
  if (servicesContainer) {
    new ContactForm('#contact-form-container-services', {
      pageType: 'services',
      enableAnalytics: true
    })
  }
}

// Smooth scrolling with offset for sticky elements
function initSmoothScrollingWithOffset() {
  const links = document.querySelectorAll('a[href^="#"]')
  
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href')
      
      if (href === '#') {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      
      const target = document.querySelector(href)
      if (target) {
        e.preventDefault()
        const navHeight = document.querySelector('.navbar').offsetHeight
        const ctaHeight = document.querySelector('.sticky-cta.show')?.offsetHeight || 0
        const offsetTop = target.offsetTop - navHeight - ctaHeight - 20
        
        window.scrollTo({ top: offsetTop, behavior: 'smooth' })
      }
    })
  })
}

// Page load performance optimization
function optimizePageLoad() {
  // Preload critical images
  const criticalImages = [
    'https://wpweb.org/wp-content/uploads/2022/04/cropped-cropped-wpweb-logo-7631-76x75-1.png'
  ]
  
  criticalImages.forEach(src => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    document.head.appendChild(link)
  })
}

// Service card click tracking (for analytics)
function initServiceTracking() {
  const serviceCards = document.querySelectorAll('.service-card')
  
  serviceCards.forEach((card, index) => {
    const serviceName = card.querySelector('h3')?.textContent || `Service ${index + 1}`
    
    card.addEventListener('click', () => {
      // Track service interaction
      if (window.gtag) {
        window.gtag('event', 'service_card_click', {
          'service_name': serviceName,
          'card_position': index + 1
        })
      }
      
      console.log(`Service clicked: ${serviceName}`)
    })
  })
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize AOS with custom settings for services page
  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
    mirror: false,
    offset: 50
  })

  // Initialize all components
  new StickyCTA()
  new ServiceCardEnhancer()
  new ProcessStepsAnimator()
  new StatsCounter()
  initServicesContactForm()
  
  // Initialize additional functionality
  initSmoothScrollingWithOffset()
  optimizePageLoad()
  initServiceTracking()
})

// Add viewport meta tag optimization for mobile
if (window.innerWidth <= 768) {
  const viewport = document.querySelector('meta[name="viewport"]')
  if (viewport) {
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
  }
}

// Console log for development
console.log('WPWeb Services page loaded successfully!')

// Export for potential external use
export {
  StickyCTA,
  ServiceCardEnhancer,
  ProcessStepsAnimator,
  StatsCounter
}
