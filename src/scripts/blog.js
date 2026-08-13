// Blog pages (index + articles): nav behavior + scroll animations
import AOS from 'aos'
import { HamburgerMenu, initSmoothScrolling } from './shared.js'

AOS.init({ duration: 800, easing: 'ease-in-out', once: true, mirror: false })
new HamburgerMenu()
initSmoothScrolling()
