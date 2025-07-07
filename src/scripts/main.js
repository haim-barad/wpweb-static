// Import AOS for scroll animations
import AOS from 'aos'
// Import reusable contact form component
import { ContactForm } from '../components/contact-form.js'

// Initialize AOS
AOS.init({
  duration: 800,
  easing: 'ease-in-out',
  once: true,
  mirror: false
})

// Simple accordion functionality
class SimpleAccordion {
  constructor(selector) {
    this.accordion = document.querySelector(selector)
    this.init()
  }

  init() {
    if (!this.accordion) return

    const headers = this.accordion.querySelectorAll('.accordion-header')
    headers.forEach(header => {
      header.addEventListener('click', this.togglePanel.bind(this))
    })
  }

  togglePanel(event) {
    const header = event.currentTarget
    const panel = header.nextElementSibling
    const isExpanded = header.getAttribute('aria-expanded') === 'true'

    // Close all panels
    const allHeaders = this.accordion.querySelectorAll('.accordion-header')
    const allPanels = this.accordion.querySelectorAll('.accordion-panel')

    allHeaders.forEach(h => h.setAttribute('aria-expanded', 'false'))
    allPanels.forEach(p => p.classList.remove('open'))

    // Open clicked panel if it was closed
    if (!isExpanded) {
      header.setAttribute('aria-expanded', 'true')
      panel.classList.add('open')
    }
  }
}

// Hamburger Menu functionality
class HamburgerMenu {
  constructor() {
    this.hamburger = document.getElementById('hamburger')
    this.navMenu = document.querySelector('.nav-menu')
    this.init()
  }

  init() {
    if (!this.hamburger || !this.navMenu) return

    this.hamburger.addEventListener('click', this.toggleMenu.bind(this))
    
    // Close menu when clicking on nav links
    const navLinks = this.navMenu.querySelectorAll('.nav-link')
    navLinks.forEach(link => {
      link.addEventListener('click', this.closeMenu.bind(this))
    })

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
      if (!this.hamburger.contains(event.target) && !this.navMenu.contains(event.target)) {
        this.closeMenu()
      }
    })
  }

  toggleMenu() {
    this.hamburger.classList.toggle('active')
    this.navMenu.classList.toggle('active')
  }

  closeMenu() {
    this.hamburger.classList.remove('active')
    this.navMenu.classList.remove('active')
  }
}

// Smooth Scrolling for anchor links
function initSmoothScrolling() {
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
        const offsetTop = target.offsetTop - 80 // Account for sticky nav
        window.scrollTo({ top: offsetTop, behavior: 'smooth' })
      }
    })
  })
}

// Initialize Contact Form Component
function initContactForm() {
  // Check if we're on the home page
  const homeContainer = document.getElementById('contact-form-container-home')
  if (homeContainer) {
    new ContactForm('#contact-form-container-home', {
      pageType: 'home',
      enableAnalytics: true
    })
  }
}

// FAQ Animation Enhancement
function initFAQAnimations() {
  const faqItems = document.querySelectorAll('.faq-item')
  
  faqItems.forEach(item => {
    item.addEventListener('toggle', function() {
      if (this.open) {
        // Close other items
        faqItems.forEach(otherItem => {
          if (otherItem !== this && otherItem.open) {
            otherItem.open = false
          }
        })
      }
    })
  })
}

// Pricing Card Animation
function initPricingAnimations() {
  const pricingCards = document.querySelectorAll('.pricing-card')
  
  pricingCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = this.classList.contains('featured') 
        ? 'scale(1.08) translateY(-8px)' 
        : 'translateY(-12px)'
    })
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = this.classList.contains('featured') 
        ? 'scale(1.05)' 
        : 'translateY(0)'
    })
  })
}

// Scroll-triggered animations for counters/stats
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in')
      }
    })
  }, observerOptions)
  
  const animateElements = document.querySelectorAll('.feature-item, .pricing-card, .faq-item')
  animateElements.forEach(el => observer.observe(el))
}

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SimpleAccordion('#features-accordion')
  new HamburgerMenu()
  initContactForm()
  initSmoothScrolling()
  initFAQAnimations()
  initPricingAnimations()
  initScrollAnimations()
})

// Add smooth scrolling behavior
document.documentElement.style.scrollBehavior = 'smooth'

// Console log for development
console.log('WPWeb loaded successfully!')
