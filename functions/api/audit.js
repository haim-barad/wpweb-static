/**
 * WPWeb AI Visibility Audit — Cloudflare Pages Function
 * Route: POST /api/audit
 *
 * Fetches the target page (plus robots.txt and llms.txt) server-side and
 * scores it 0–100 on AI-discovery criteria: structured data, AI crawler
 * access, llms.txt, meta signals, content structure, E-E-A-T signals.
 * Returns score + per-check breakdown + prioritized recommendations.
 */

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\..*|10\..*|192\.168\..*|169\.254\..*|172\.(1[6-9]|2\d|3[01])\..*|\[?::1\]?.*|.*\.local)$/i

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function normalizeUrl(raw) {
  let input = String(raw || '').trim()
  if (!input) return null
  if (!/^https?:\/\//i.test(input)) input = 'https://' + input
  let u
  try {
    u = new URL(input)
  } catch {
    return null
  }
  if (!/^https?:$/.test(u.protocol)) return null
  if (!u.hostname.includes('.') || PRIVATE_HOST.test(u.hostname)) return null
  return u
}

async function fetchText(url, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,text/plain,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    const text = await res.text()
    return { status: res.status, finalUrl: res.url, text: text.slice(0, 1500000), ok: res.ok }
  } catch (e) {
    return { status: 0, finalUrl: url, text: '', ok: false, error: String((e && e.name) || e) }
  } finally {
    clearTimeout(timer)
  }
}

/* ---------------- robots.txt parsing ---------------- */

function robotsAllowsAll(robotsText) {
  // Returns { allowed, detail } for AI crawlers (GPTBot, ClaudeBot, PerplexityBot).
  if (!robotsText) return { allowed: true, detail: 'robots.txt could not be fetched — assuming unrestricted.' }
  const lines = robotsText.split(/\r?\n/)
  const groups = []
  let current = null
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const field = m[1].toLowerCase()
    const value = m[2].trim()
    if (field === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
    } else if ((field === 'disallow' || field === 'allow') && current) {
      current.rules.push({ field, value })
    }
  }

  function groupBlocks(g) {
    // Blocked = a bare "Disallow: /" with no broader Allow overriding it.
    const disallowRoot = g.rules.some((r) => r.field === 'disallow' && r.value === '/')
    const allowRoot = g.rules.some((r) => r.field === 'allow' && (r.value === '/' || r.value === '/*'))
    return disallowRoot && !allowRoot
  }

  const aiAgents = ['gptbot', 'claudebot', 'perplexitybot', 'google-extended', 'anthropic-ai']
  const wildcard = groups.find((g) => g.agents.includes('*'))
  const blockedFor = []

  for (const agent of aiAgents) {
    const specific = groups.find((g) => g.agents.includes(agent))
    const g = specific || wildcard
    if (g && groupBlocks(g)) blockedFor.push(agent)
  }

  if (blockedFor.length === 0) {
    return { allowed: true, detail: 'AI crawlers are not blocked in robots.txt.' }
  }
  return { allowed: false, detail: 'robots.txt blocks: ' + blockedFor.join(', ') }
}

/* ---------------- HTML analysis helpers ---------------- */

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractJsonLd(html) {
  const blocks = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    let raw = m[1].trim().replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim()
    try {
      blocks.push(JSON.parse(raw))
    } catch {
      blocks.push(null) // present but invalid
    }
  }
  return blocks
}

function collectTypes(node, out) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, out))
    return
  }
  if (node['@type']) {
    const t = node['@type']
    ;(Array.isArray(t) ? t : [t]).forEach((x) => typeof x === 'string' && out.add(x))
  }
  if (node['@graph']) collectTypes(node['@graph'], out)
  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') collectTypes(v, out)
  }
}

function getMeta(html, name) {
  const re = new RegExp(
    '<meta[^>]+(?:name|property)=["\']' + name + '["\'][^>]*content=["\']([^"\']*)["\']',
    'i'
  )
  let m = html.match(re)
  if (m) return m[1]
  const re2 = new RegExp(
    '<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:name|property)=["\']' + name + '["\']',
    'i'
  )
  m = html.match(re2)
  return m ? m[1] : ''
}

/* ---------------- Scoring ---------------- */

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

export async function onRequestPost(context) {
  let body
  try {
    body = await context.request.json()
  } catch {
    return json({ error: 'Send a JSON body: { "url": "https://example.com" }' }, 400)
  }

  const target = normalizeUrl(body.url)
  if (!target) {
    return json({ error: 'Please enter a valid website address (e.g. https://example.com).' }, 400)
  }

  const origin = target.origin
  const [page, robots, llms] = await Promise.all([
    fetchText(target.href),
    fetchText(origin + '/robots.txt'),
    fetchText(origin + '/llms.txt'),
  ])

  if (page.status === 0) {
    return json(
      {
        error:
          'We could not reach that site (DNS failure, timeout, or it blocks automated checks). Double-check the address and try again.',
      },
      422
    )
  }

  const html = page.text
  const recommendations = []

  /* 1. Structured data — 25 pts */
  const jsonLdBlocks = extractJsonLd(html)
  const validBlocks = jsonLdBlocks.filter(Boolean)
  const types = new Set()
  validBlocks.forEach((b) => collectTypes(b, types))
  const hasInvalidJsonLd = jsonLdBlocks.length > validBlocks.length
  const microdata = (html.match(/itemscope/gi) || []).length
  const entityTypes = ['Organization', 'LocalBusiness', 'WebSite', 'ProfessionalService', 'Person', 'Article', 'Product', 'FAQPage', 'BreadcrumbList', 'SoftwareApplication', 'Service']
  const strongTypes = [...types].filter((t) => entityTypes.includes(t))

  let sdPoints = 0
  let sdStatus = 'fail'
  let sdDetail
  if (validBlocks.length > 0 && strongTypes.length >= 2) {
    sdPoints = 25
    sdStatus = 'pass'
    sdDetail = `JSON-LD structured data found with ${strongTypes.length} recognized entity types (${strongTypes.slice(0, 5).join(', ')}).`
  } else if (validBlocks.length > 0 || microdata > 0) {
    sdPoints = validBlocks.length > 0 ? 14 : 8
    sdStatus = 'partial'
    sdDetail = validBlocks.length > 0
      ? `JSON-LD present but thin — types found: ${[...types].slice(0, 5).join(', ') || 'none recognized'}.`
      : `Microdata (itemscope) found but no JSON-LD. JSON-LD is the format AI systems parse most reliably.`
  } else {
    sdDetail = 'No structured data (JSON-LD or microdata) detected. AI systems rely on schema markup for entity recognition.'
  }
  if (hasInvalidJsonLd) {
    sdPoints = clamp(sdPoints - 5, 0, 25)
    sdDetail += ' Warning: at least one JSON-LD block failed to parse.'
  }
  if (sdStatus !== 'pass') {
    recommendations.push({
      priority: 'high',
      title: 'Add Schema.org structured data (JSON-LD)',
      detail:
        'Implement Organization, WebSite, and FAQPage schema in JSON-LD format. Structured data is how ChatGPT, Perplexity, and Google AI Overviews recognize your business as an entity — pages with schema are cited significantly more often.',
    })
  } else if (!types.has('FAQPage')) {
    recommendations.push({
      priority: 'low',
      title: 'Add FAQPage schema to key pages',
      detail:
        'Your schema foundation is solid. Adding FAQPage markup to high-intent pages gives AI assistants direct question-answer pairs to quote.',
    })
  }

  /* 2. AI crawler access — 20 pts */
  const robotsInfo =
    robots.status === 200
      ? robotsAllowsAll(robots.text)
      : robots.status === 404 || robots.status === 403
      ? { allowed: true, detail: `robots.txt returned HTTP ${robots.status} — AI crawlers are unrestricted by default.` }
      : { allowed: true, detail: 'robots.txt could not be fetched.' }

  let caPoints = robotsInfo.allowed ? 20 : 0
  let caStatus = robotsInfo.allowed ? 'pass' : 'fail'
  if (robotsInfo.allowed && robots.status !== 200) caPoints = 16 // allowed but unverifiable
  if (!robotsInfo.allowed) {
    recommendations.push({
      priority: 'high',
      title: 'Unblock AI crawlers in robots.txt',
      detail:
        robotsInfo.detail +
        ' — sites blocked from GPTBot/ClaudeBot/PerplexityBot are invisible in AI answers. Allow these user agents unless you have a specific reason not to.',
    })
  }

  /* 3. llms.txt — 15 pts */
  let ltPoints = 0
  let ltStatus = 'fail'
  let ltDetail
  if (llms.status === 200 && llms.text.trim().length > 40) {
    ltPoints = 15
    ltStatus = 'pass'
    ltDetail = `llms.txt found (${Math.round(llms.text.length / 102.4) / 10} KB). AI crawlers get a machine-readable map of your content.`
  } else if (llms.status === 200) {
    ltPoints = 6
    ltStatus = 'partial'
    ltDetail = 'llms.txt exists but appears empty or too short to be useful.'
  } else {
    ltDetail = 'No llms.txt found. This emerging standard gives AI crawlers a curated map of your most important content.'
  }
  if (ltStatus !== 'pass') {
    recommendations.push({
      priority: 'medium',
      title: 'Create an llms.txt file',
      detail:
        'Publish /llms.txt describing your business, key pages, and content hierarchy. It is the llms.txt equivalent of a sitemap for LLMs — early adopters are seeing better AI comprehension of their site.',
    })
  }

  /* 4. Meta & social signals — 15 pts */
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ''
  const titleLen = title.trim().length
  const desc = getMeta(html, 'description')
  const canonical = /<link[^>]+rel=["']canonical["']/i.test(html)
  const ogTags = ['og:title', 'og:description', 'og:image'].filter((t) => getMeta(html, t)).length
  const twitterCard = !!getMeta(html, 'twitter:card')

  let metaPoints = 0
  const metaNotes = []
  if (titleLen >= 20 && titleLen <= 70) metaPoints += 4
  else if (titleLen > 0) { metaPoints += 2; metaNotes.push(`title is ${titleLen} chars (ideal: 20–70)`) }
  else metaNotes.push('missing <title>')
  if (desc.length >= 70 && desc.length <= 170) metaPoints += 4
  else if (desc.length > 0) { metaPoints += 2; metaNotes.push(`meta description is ${desc.length} chars (ideal: 70–170)`) }
  else metaNotes.push('missing meta description')
  if (canonical) metaPoints += 3; else metaNotes.push('no canonical link')
  metaPoints += Math.min(ogTags, 3)
  if (ogTags < 3) metaNotes.push(`${3 - ogTags} Open Graph tags missing`)
  if (twitterCard) metaPoints += 1
  metaPoints = clamp(metaPoints, 0, 15)
  const metaStatus = metaPoints >= 12 ? 'pass' : metaPoints >= 7 ? 'partial' : 'fail'
  if (metaStatus !== 'pass') {
    recommendations.push({
      priority: 'medium',
      title: 'Tighten title tags, meta descriptions, and Open Graph',
      detail:
        'Issues found: ' + (metaNotes.join('; ') || 'several meta signals missing') +
        '. AI search tools read these fields verbatim when summarizing a page — precise, specific metadata gets quoted; generic metadata gets skipped.',
    })
  }

  /* 5. Content structure & citability — 15 pts */
  const visibleText = stripTags(html)
  const words = visibleText ? visibleText.split(' ').length : 0
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length
  const hasLists = /<(ul|ol|table)[\s>]/i.test(html)
  const hasFaqMarkup = /FAQPage|faq/i.test(html)
  const internalLinks = (html.match(/href=["']\/[^"']*/gi) || []).length

  let csPoints = 0
  const csNotes = []
  if (h1Count === 1) csPoints += 3
  else csNotes.push(h1Count === 0 ? 'no <h1>' : `${h1Count} <h1> tags (use exactly one)`)
  if (h2Count >= 2) csPoints += 3
  else csNotes.push('fewer than 2 <h2> subheadings')
  if (words >= 400) csPoints += 5
  else if (words >= 150) { csPoints += 2; csNotes.push(`only ~${words} words of text`) }
  else csNotes.push(`only ~${words} words of crawlable text — heavy JS rendering?`)
  if (hasLists || hasFaqMarkup) csPoints += 2
  if (internalLinks >= 3) csPoints += 2
  csPoints = clamp(csPoints, 0, 15)
  const csStatus = csPoints >= 12 ? 'pass' : csPoints >= 7 ? 'partial' : 'fail'
  if (csStatus !== 'pass') {
    recommendations.push({
      priority: words < 150 ? 'high' : 'medium',
      title: 'Make content crawlable and quotable',
      detail:
        'Issues found: ' + (csNotes.join('; ') || 'structure could be stronger') +
        '. AI systems cite self-contained passages with clear headings, lists, and specifics. If your content only renders via JavaScript, crawlers may see an empty page.',
    })
  }

  /* 6. E-E-A-T signals — 10 pts */
  let eeatPoints = 0
  const eeatNotes = []
  if (target.protocol === 'https:') eeatPoints += 2; else eeatNotes.push('site not served over HTTPS')
  if (types.has('Person') || /rel=["']author["']|itemprop=["']author["']/i.test(html)) eeatPoints += 3
  else eeatNotes.push('no author/Person markup')
  if (/sameAs/i.test(html) || (html.match(/linkedin\.com|twitter\.com|x\.com|facebook\.com/gi) || []).length > 0) eeatPoints += 3
  else eeatNotes.push('no entity linking (sameAs / social profiles)')
  if (/mailto:|tel:|address/i.test(html)) eeatPoints += 2
  else eeatNotes.push('no visible contact info')
  eeatPoints = clamp(eeatPoints, 0, 10)
  const eeatStatus = eeatPoints >= 8 ? 'pass' : eeatPoints >= 5 ? 'partial' : 'fail'
  if (eeatStatus !== 'pass') {
    recommendations.push({
      priority: 'medium',
      title: 'Strengthen E-E-A-T trust signals',
      detail:
        'Issues found: ' + (eeatNotes.join('; ') || 'trust signals are thin') +
        '. AI models weigh authorship, entity consistency, and trust infrastructure when deciding who to recommend.',
    })
  }

  const score = clamp(sdPoints + caPoints + ltPoints + metaPoints + csPoints + eeatPoints, 0, 100)
  const grade =
    score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Needs Work' : 'At Risk'

  const order = { high: 0, medium: 1, low: 2 }
  recommendations.sort((a, b) => order[a.priority] - order[b.priority])

  return json({
    url: target.href,
    finalUrl: page.finalUrl,
    httpStatus: page.status,
    score,
    grade,
    checks: [
      { id: 'structured_data', label: 'Schema.org structured data', status: sdStatus, points: sdPoints, max: 25, detail: sdDetail },
      { id: 'ai_crawler_access', label: 'AI crawler access (robots.txt)', status: caStatus, points: caPoints, max: 20, detail: robotsInfo.detail },
      { id: 'llms_txt', label: 'llms.txt manifest', status: ltStatus, points: ltPoints, max: 15, detail: ltDetail },
      { id: 'meta_signals', label: 'Meta & social signals', status: metaStatus, points: metaPoints, max: 15, detail: metaStatus === 'pass' ? 'Title, description, canonical, and Open Graph tags all in order.' : 'Meta signal gaps detected.' },
      { id: 'content_structure', label: 'Content structure & citability', status: csStatus, points: csPoints, max: 15, detail: csStatus === 'pass' ? `~${words} words with solid heading structure and quotable formatting.` : 'Content structure gaps reduce AI citability.' },
      { id: 'eeat', label: 'E-E-A-T trust signals', status: eeatStatus, points: eeatPoints, max: 10, detail: eeatStatus === 'pass' ? 'Authorship, entity links, and contact signals present.' : 'Trust signal gaps detected.' },
    ],
    recommendations,
    fetchedAt: new Date().toISOString(),
    note: 'Score reflects server-rendered HTML as seen by crawlers. JavaScript-only content is not executed.',
  })
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://wpweb.org',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
