// WPWeb AI Visibility Audit — client controller
// Talks to the Cloudflare Pages Function at /api/audit (server-side fetch).
import AOS from 'aos'
import { ContactForm } from '../components/contact-form.js'
import { HamburgerMenu, initSmoothScrolling, initFAQAnimations } from './shared.js'

AOS.init({ duration: 800, easing: 'ease-in-out', once: true, mirror: false })

const GRADE_DESC = {
  Excellent: 'Your site is well-positioned for AI discovery. Small refinements below could make you the default recommendation.',
  Good: 'Solid foundation. Fix the flagged gaps and AI assistants will start citing you more often.',
  'Needs Work': 'AI assistants can partially see you, but key signals are missing. Competitors with better GEO will get recommended instead.',
  'At Risk': 'Your site is largely invisible to AI search. The good news: everything below is fixable, usually within days.',
}

const STATUS_LABEL = { pass: 'Pass', partial: 'Partial', fail: 'Failed' }
const PRIORITY_LABEL = { high: 'High priority', medium: 'Medium priority', low: 'Nice to have' }

const form = document.getElementById('audit-form')
const urlInput = document.getElementById('audit-url')
const errorBox = document.getElementById('audit-error')
const loading = document.getElementById('audit-loading')
const loadingText = document.getElementById('audit-loading-text')
const results = document.getElementById('audit-results')

const LOADING_STEPS = [
  'Fetching your site…',
  'Checking Schema.org structured data…',
  'Testing AI crawler access…',
  'Looking for llms.txt…',
  'Analyzing content citability…',
  'Scoring E-E-A-T signals…',
]

let loadingTimer = null

function startLoadingCycle() {
  let i = 0
  loadingText.textContent = LOADING_STEPS[0]
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_STEPS.length
    loadingText.textContent = LOADING_STEPS[i]
  }, 2600)
}

function stopLoadingCycle() {
  if (loadingTimer) {
    clearInterval(loadingTimer)
    loadingTimer = null
  }
}

function showError(msg) {
  errorBox.textContent = msg
  urlInput.setAttribute('aria-invalid', 'true')
}

function clearError() {
  errorBox.textContent = ''
  urlInput.removeAttribute('aria-invalid')
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

function gaugeColor(score) {
  if (score >= 75) return '#22C55E'
  if (score >= 50) return '#E9A020'
  return '#EF4444'
}

function renderGauge(score) {
  const circle = document.getElementById('gauge-value')
  const r = 68
  const circumference = 2 * Math.PI * r
  circle.style.strokeDasharray = `${circumference}`
  circle.style.strokeDashoffset = `${circumference}`
  const color = gaugeColor(score)
  circle.style.stroke = color
  // animate
  requestAnimationFrame(() => {
    circle.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
    circle.style.strokeDashoffset = `${circumference * (1 - score / 100)}`
  })
  // count-up
  const num = document.getElementById('score-number')
  const start = performance.now()
  function tick(now) {
    const t = Math.min((now - start) / 1200, 1)
    num.textContent = Math.round(score * t)
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  document.querySelector('.audit-gauge').setAttribute(
    'aria-label',
    `AI visibility score: ${score} out of 100`
  )
}

function renderResults(data) {
  const { score, grade, checks, recommendations, finalUrl } = data

  renderGauge(score)
  const gradeEl = document.getElementById('score-grade')
  gradeEl.textContent = grade
  gradeEl.style.color = gaugeColor(score)
  document.getElementById('score-site').textContent = finalUrl || urlInput.value
  document.getElementById('grade-desc').textContent = GRADE_DESC[grade] || ''

  const checksEl = document.getElementById('audit-checks')
  checksEl.innerHTML = checks
    .map((c) => `
      <li class="audit-check audit-check-${c.status}">
        <div class="audit-check-head">
          <span class="audit-check-status">${STATUS_LABEL[c.status] || c.status}</span>
          <span class="audit-check-label">${escapeHtml(c.label)}</span>
          <span class="audit-check-points">${c.points}/${c.max} pts</span>
        </div>
        <p class="audit-check-detail">${escapeHtml(c.detail)}</p>
      </li>`)
    .join('')

  const recsEl = document.getElementById('audit-recs')
  recsEl.innerHTML = recommendations.length
    ? recommendations
        .map((r) => `
          <li class="audit-rec audit-rec-${r.priority}">
            <span class="audit-rec-priority">${PRIORITY_LABEL[r.priority]}</span>
            <h4>${escapeHtml(r.title)}</h4>
            <p>${escapeHtml(r.detail)}</p>
          </li>`)
        .join('')
    : '<li class="audit-rec">Excellent — no major recommendations. Keep your schema and content fresh.</li>'

  results.hidden = false
  results.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function runAudit(event) {
  event.preventDefault()
  clearError()

  const raw = urlInput.value.trim()
  if (!raw) {
    showError('Please enter your website address.')
    urlInput.focus()
    return
  }
  if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(raw)) {
    showError('That does not look like a valid website address. Try something like https://yourbusiness.com')
    urlInput.focus()
    return
  }

  form.hidden = true
  results.hidden = true
  loading.hidden = false
  startLoadingCycle()

  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url: raw }),
    })
    let data
    try {
      data = await res.json()
    } catch {
      throw new Error('The audit service returned an unexpected response. Please try again.')
    }
    if (!res.ok) {
      throw new Error(data.error || `The audit could not be completed (HTTP ${res.status}).`)
    }
    stopLoadingCycle()
    loading.hidden = true
    renderResults(data)
  } catch (err) {
    stopLoadingCycle()
    loading.hidden = true
    form.hidden = false
    showError(err.message || 'Something went wrong. Please try again.')
    urlInput.focus()
  }
}

form.addEventListener('submit', runAudit)
urlInput.addEventListener('input', clearError)

// Prefill from ?url= query param (used by CTAs)
const prefilled = new URLSearchParams(window.location.search).get('url')
if (prefilled) {
  urlInput.value = prefilled
  urlInput.focus()
}

// Contact form at bottom of page
new ContactForm('#contact-form-container-audit', {
  pageType: 'audit',
  enableAnalytics: true,
  customServiceOptions: `
    <option value="free-audit-followup">Free audit follow-up call</option>
    <option value="geo-pro">GEO Pro Plan ($899/month)</option>
    <option value="growth">Growth Plan ($399/month)</option>
    <option value="core">Core Plan ($149/month)</option>
    <option value="starter">Starter Plan ($59/month)</option>
    <option value="enterprise">Enterprise ($1,999/month)</option>
    <option value="consultation">Free Consultation</option>
  `,
})

new HamburgerMenu()
initSmoothScrolling()
initFAQAnimations()
