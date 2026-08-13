// Shared UI behaviors used across pages (audit, blog, future pages).
// Mirrors the behavior in main.js without importing it.

// Hamburger Menu functionality
export class HamburgerMenu {
  constructor() {
    this.hamburger = document.getElementById('hamburger')
    this.navMenu = document.querySelector('.nav-menu')
    this.init()
  }

  init() {
    if (!this.hamburger || !this.navMenu) return

    this.hamburger.addEventListener('click', this.toggleMenu.bind(this))

    const navLinks = this.navMenu.querySelectorAll('.nav-link')
    navLinks.forEach(link => {
      link.addEventListener('click', this.closeMenu.bind(this))
    })

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

// Smooth Scrolling for anchor links (only same-page anchors)
export function initSmoothScrolling() {
  const links = document.querySelectorAll('a[href^="#"]')

  links.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href')

      if (href === '#') {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      const target = document.querySelector(href)
      if (target) {
        e.preventDefault()
        const offsetTop = target.offsetTop - 80
        window.scrollTo({ top: offsetTop, behavior: 'smooth' })
      }
    })
  })
}

// FAQ single-open behavior
export function initFAQAnimations() {
  const faqItems = document.querySelectorAll('.faq-item')

  faqItems.forEach(item => {
    item.addEventListener('toggle', function () {
      if (this.open) {
        faqItems.forEach(otherItem => {
          if (otherItem !== this && otherItem.open) {
            otherItem.open = false
          }
        })
      }
    })
  })
}
