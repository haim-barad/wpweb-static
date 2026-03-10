# GEO Audit Report: WPWeb

**Audit Date:** 2026-03-10
**URL:** https://wpweb.org
**Business Type:** Agency/Services — WordPress management and GEO optimization
**Pages Analyzed:** 2 (index.html, services.html)

---

## Executive Summary

**Overall GEO Score: 45/100 (Poor)**

WPWeb's website has an excellent technical foundation — fully static HTML, comprehensive AI crawler permissions, and a well-formed llms.txt — but is critically hampered by the near-total absence of off-site brand authority (score: 12/100). No Wikipedia article, no third-party review profiles, no verifiable external citations. The services.html page also remains on the old pre-redesign design system (old fonts, broken WordPress logo URL, Font Awesome CDN, stale 2024 copyright) and carries zero structured data. An ironic credibility gap persists: WPWeb sells GEO optimization services but its own schema lacks the `sameAs` property that is the primary signal for AI entity recognition.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 62/100 | 25% | 15.5 |
| Brand Authority | 12/100 | 20% | 2.4 |
| Content E-E-A-T | 38/100 | 20% | 7.6 |
| Technical GEO | 81/100 | 15% | 12.15 |
| Schema & Structured Data | 38/100 | 10% | 3.8 |
| Platform Optimization | 38/100 | 10% | 3.8 |
| **Overall GEO Score** | | | **45/100** |

---

## Critical Issues (Fix Immediately)

### C1: services.html Has Not Been Updated to New Design

The homepage (`index.html`) was completely redesigned with the new dark theme (Fraunces/Plus Jakarta Sans fonts, amber `#E9A020` brand color, inline SVG icons, new nav/footer structure). The services page (`services.html`) was not updated and remains on the old design:

- Loads old fonts: `Sarabun` and `Questrial` (not `Fraunces`/`Plus Jakarta Sans`)
- `theme-color` is `#2563eb` (old blue) instead of `#E9A020` (amber)
- Logo references a broken WordPress media URL: `https://wpweb.org/wp-content/uploads/2022/04/cropped-cropped-wpweb-logo-7631-76x75-1.png` — this path does not exist on a Cloudflare Pages static site
- Loads Font Awesome 6.0.0 from cdnjs CDN — not in CSP `style-src`, may be blocked
- Footer copyright shows `2024` (homepage correctly shows `2026`)
- Footer links for Privacy Policy, Terms of Service, and Cookie Policy use `href="#"` (dead links)
- No Schema.org structured data (zero JSON-LD)
- Missing `og:image` and `twitter:image` meta tags

**Fix:** Complete redesign of `services.html` to match the new design system. Add Schema.org markup (WebPage, BreadcrumbList, Service schemas). Fix all broken references and meta tags.

### C2: Organization Schema Has No `sameAs` Property

The homepage Organization JSON-LD has no `sameAs` array. This is the single most important signal for AI entity recognition — without it, no AI model can connect "WPWeb" to any external knowledge graph node, regardless of how complete the rest of the schema is. The irony is significant: WPWeb sells sameAs linking to clients but does not implement it on its own site.

**Fix:** Add `sameAs` array to the Organization schema block (see Schema section for template). Priority order: LinkedIn company page → Crunchbase → Clutch → GitHub → Twitter/X.

### C3: No Verifiable Off-Site Brand Presence

No Wikipedia article, no Trustpilot profile (404), no Clutch profile (403), no G2 listing, no Reddit mentions, no press coverage, no YouTube channel. Brand Authority score: 12/100. AI citation behavior is driven by off-site entity corroboration — the site is technically invisible to AI-generated service roundups because no third-party editorial source references WPWeb.

**Fix:** Create a Clutch profile (highest B2B agency citation frequency), submit to Bing Webmaster Tools, create a LinkedIn company page. These three actions collectively unlock the sameAs schema fix and set the foundation for a Wikipedia article.

### C4: Brand Namespace Collision

Bing search for "WPWeb" surfaces "WPWeb Infotech" (a separate Indian IT company) and WhatsApp Web before wpweb.org. This namespace collision reduces AI entity confidence across ChatGPT, Gemini, and Bing Copilot. "WPWeb" is too generic to be a distinctive entity identifier in AI knowledge graphs.

**Fix:** Adopt "WPWeb.org" as the canonical brand identifier across all external profiles. Update title tags to include the TLD (e.g., "WPWeb.org — WordPress Management & GEO Optimization"). Claim the brand keyword in Bing Webmaster Tools.

---

## High Priority Issues

### H1: Georgia Tech/Princeton Citation Is Unverifiable

The claim "Research from Georgia Tech and Princeton shows GEO-optimized content receives 30–115% more visibility in AI-generated responses" appears on the homepage, in llms.txt, and in the GEO deep-dive section. The citation is never linked to a source URL, paper title, or authors. A search for this specific joint Georgia Tech/Princeton study does not surface a verifiable matching paper. This is the single largest trust risk on the site — citing a non-linked, potentially unverifiable academic study while selling GEO optimization services is a significant credibility gap.

**Fix:** Option A — link directly to the specific paper (title, authors, year, URL). Option B — attribute it to the 2023 GEO paper "GEO: Generative Engine Optimization" by Pradeep Aggarwal et al. from Princeton and IIT Delhi (not Georgia Tech). Option C — rephrase as a directional claim: "GEO-optimized content consistently shows increased AI citation frequency." Do not leave the claim unlinked.

### H2: Privacy Policy and Terms of Service Pages Do Not Exist

The homepage links to `/privacy` and `/terms`. The services page links to `href="#"` for the same. Neither URL serves actual legal document content. For a company managing WordPress sites, handling hosting credentials and billing data, the absence of real legal pages is both a compliance risk and a trust failure that AI models and users notice.

**Fix:** Create `/privacy` and `/terms` as real HTML pages with full legal document content identifying the legal entity, jurisdiction, data handling practices, and effective date. Update `public/_redirects` or create the actual HTML files in `src/`.

### H3: services.html Missing All Schema Markup

The services page has zero JSON-LD. It is the second most important page on the site (primary conversion page listing all 10 named services) and has no structured data signal for AI crawlers. See recommended template in Schema section below.

### H4: No Icon PNG Files Exist

The homepage schema references `https://wpweb.org/icons/icon-192.png` as the Organization logo, and the OG image references `https://wpweb.org/icons/og-image.png`. Neither file exists. The manifest.json references three PWA icon paths that also do not exist. These are broken image references that would fail validation.

**Fix:** Create proper PNG icon files:
- `/public/icons/icon-192.png` — 192×192px amber W mark on dark background (used in schema and manifest)
- `/public/icons/icon-512.png` — 512×512px version
- `/public/icons/og-image.png` — 1200×630px open graph image with logo and tagline

### H5: No XML Sitemap Was Present at Audit Time

At audit time, `https://wpweb.org/sitemap.xml` was returning homepage HTML (Cloudflare Pages catch-all fallback) rather than valid XML. **This has been fixed** — `public/sitemap.xml` was created during this audit. Verify deployment and confirm the URL serves `application/xml` content-type.

### H6: Font Awesome CSP Gap on services.html

`services.html` loads Font Awesome 6.0.0 from `https://cdnjs.cloudflare.com/...` but the `_headers` CSP `style-src` directive does not include `cdnjs.cloudflare.com`. This means the Font Awesome stylesheet may be blocked by the CSP, breaking icon rendering on the services page.

**Fix:** This issue resolves itself when services.html is updated to the new design (which uses inline SVGs, not Font Awesome). Until then, either add `https://cdnjs.cloudflare.com` to `style-src` in `_headers`, or self-host Font Awesome.

---

## Medium Priority Issues

### M1: No `sameAs` on Individual FAQ Answers — Opportunities for Specific Stat Citations

FAQ answers average 25–35 words — slightly below the 40–60 word target for Google AI Overview extraction. Answers with a direct first sentence restating the question topic and specific numbers perform significantly better.

**Fix:** Expand each FAQ answer to 40–60 words. Example: current answer for "What is GEO optimization?" — expand to include a specific metric like "Sites optimized with proper schema and llms.txt implementation see measurably higher citation rates in AI-generated answers."

### M2: No `dateModified` on Schema Blocks

No JSON-LD block includes `dateModified` or `datePublished`. Perplexity AI and Bing Copilot heavily weight recency signals and treat undated content as potentially stale.

**Fix:** Add `"dateModified": "2026-03-10"` to the Organization, WebSite, and ProfessionalService schema blocks. Update quarterly.

### M3: AggregateRating Schema Missing for 5-Star Claim

The homepage prominently displays a "5-Star Service Rating" stat with zero schema corroboration. Google and AI models treat unsubstantiated rating claims with skepticism.

**Fix:** Add `AggregateRating` to the ProfessionalService schema block once actual review counts are established on a verifiable platform (Clutch, Trustpilot, or Google Business Profile). Do not add fabricated `ratingCount` values — only add the schema after real reviews are collected.

### M4: Organization Logo Should Be ImageObject

The Organization schema `logo` property is a plain URL string instead of an `ImageObject` with explicit `width` and `height`. This is required for Google's Organization rich result eligibility.

**Fix:** Change from `"logo": "https://wpweb.org/icons/icon-192.png"` to:
```json
"logo": {
  "@type": "ImageObject",
  "url": "https://wpweb.org/icons/icon-192.png",
  "width": 192,
  "height": 192
}
```

### M5: services.html Open Graph and Twitter Card Images Missing

`services.html` has no `og:image` and no `twitter:image` meta tags. Social sharing and AI preview cards will render without imagery.

**Fix:** Add both tags pointing to the OG image once it is created:
```html
<meta property="og:image" content="https://wpweb.org/icons/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:image" content="https://wpweb.org/icons/og-image.png" />
```

### M6: Plan Name Inconsistency — Fixed

llms.txt previously called the $99/month plan "Starter" while the homepage schema and pricing table call it "Basic." **This has been fixed** during this audit — llms.txt now consistently uses "Basic." Verify consistency across all content surfaces.

### M7: Testimonials Have No Company Names

Client testimonials name Sarah Johnson, Michael Chen, and Amanda Rodriguez with role titles but no company names. This prevents verification by AI models or readers. Role titles ("CEO," "SaaS startup founder") with no company name are treated as unverifiable.

**Fix:** Add company names or industry-specific descriptors that can be verified, or at minimum add specific outcome metrics with timeframes ("Zero downtime incidents over 18 months, March 2024–September 2025").

### M8: No `speakable` Property

No content is marked for AI assistant/voice readability via the `speakable` Schema.org property.

**Fix:** Add a WebPage entity to the homepage `@graph` with `speakable.cssSelector` targeting the hero description, FAQ answers, and GEO explanation section.

### M9: Bing Webmaster Tools Not Verified

No `msvalidate.01` meta tag detected. The site is not verified in Bing Webmaster Tools, meaning IndexNow protocol cannot be used and crawl prioritization is unavailable.

**Fix:** Register at bing.com/webmasters, add the verification meta tag to both HTML pages, and submit the sitemap.

---

## Low Priority Issues

### L1: OAI-SearchBot Not Explicitly Listed in robots.txt

OAI-SearchBot (OpenAI's web search crawler, distinct from GPTBot) is not explicitly listed. It is covered by the wildcard `Allow: /` but explicit inclusion is best practice.

### L2: `twitter:image` Missing from Homepage

Homepage has `og:image` but no `twitter:image`. X/Twitter will render the card without an image. Add `<meta name="twitter:image" content="https://wpweb.org/icons/og-image.png" />`.

### L3: Hamburger Menu Accessibility on services.html

The services page hamburger menu is a `<div>` without `button` semantics or aria attributes. The homepage correctly uses semantic elements with `aria-expanded` and `aria-controls`. Fix when services.html is redesigned.

### L4: `manifest.json` `theme_color` — Fixed

manifest.json previously used `#2563eb` (old blue). **Fixed during this audit** — now uses `#E9A020` (amber). Also updated description and icon references. Note: the referenced icon PNG paths (`/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-maskable.png`) still do not exist as files — create them (see H4).

### L5: WordPress Path Redirects Use 302 Instead of 301

`_redirects` uses 302 (temporary) for `/wp-admin/*`, `/wp-login.php`, and `/xmlrpc.php`. These paths will never be valid on this static site — they should be 301 (permanent) to avoid repeated redirect overhead.

---

## Category Deep Dives

### AI Citability (62/100)

**Strengths:**
- GEO definition block is citation-ready (self-contained, names specific AI systems)
- Pricing table is the strongest block (80/100 citability) — specific dollar amounts, three tiers, feature lists
- FAQ schema wraps all 6 Q&As — directly quotable by AI systems
- The "30–115%" stat has high extraction probability (when linked to source)

**Weaknesses:**
- Zero blog content — no specialized long-form content that drives AI citation
- Services page body text is shallow (28/100 citability) — bullet restatements of homepage with no procedural detail
- Testimonials have no verifiable specifics (18/100 citability)
- "500+ sites," "99.9% uptime," "5-star rating" are unverifiable marketing badges (22/100)
- No case studies with specific measurable outcomes

**Top Recommendation:** Publish one case study with real client metrics (anonymized is acceptable): site type, starting condition (LCP, uptime record, GEO score), work performed, measurable outcome with timeframe. Even one such page would be the highest-citability content on the site.

---

### Brand Authority (12/100)

| Platform | Status |
|---|---|
| Wikipedia | Absent — no article exists |
| Clutch | No confirmed profile (403 on fetch) |
| Trustpilot | Absent — 404 on direct URL |
| G2 / Capterra | No confirmed listing |
| LinkedIn | Unknown — bot-blocked on fetch |
| Reddit | No detectable mentions |
| YouTube | No official channel confirmed |
| Twitter/X | No confirmed account |
| GitHub | No confirmed org |
| Press/Media | Zero detectable mentions |

**Brand namespace collision:** "WPWeb Infotech" (Indian IT company) and "WhatsApp Web" compete in the WPWeb search namespace, diluting entity confidence in Bing and ChatGPT.

**Priority sequence:**
1. Create LinkedIn company page (enables sameAs schema, feeds Bing Copilot directly)
2. Create Clutch profile (highest B2B citation frequency; prerequisite for Wikipedia)
3. Submit Bing Webmaster Tools (30-minute task, immediate crawl prioritization)
4. Secure one editorial mention on WPBeginner, Kinsta blog, or WP Mayor (Wikipedia notability prerequisite)
5. Create Wikipedia article using editorial mentions as reliable sources

---

### Content E-E-A-T (38/100)

| Dimension | Score | Key Finding |
|---|---|---|
| Experience | 6/25 | No portfolio, no case studies, no before/after metrics |
| Expertise | 7/25 | No named team, no credentials, no certifications |
| Authoritativeness | 8/25 | No press, no awards, no industry partnerships |
| Trustworthiness | 17/25 | HTTPS + real email + transparent pricing; but legal pages missing, citation unverifiable |

**Note on heading structure:** The E-E-A-T subagent reported multiple H1 tags on the homepage. This was **incorrect** — source HTML verification confirms exactly one `<h1>` and five `<h2>` elements. The heading hierarchy is correct.

**Note on schema:** The E-E-A-T agent reported no schema markup on the homepage. This was also incorrect — the homepage has comprehensive JSON-LD (Organization, WebSite, ProfessionalService with OfferCatalog, FAQPage). The agent may have fetched a cached version before the new deployment propagated.

**Highest-leverage action:** Disclose company identity (About page with founding year, location, named founder/lead) and fix the unverifiable citation (H1 above). These two changes would raise E-E-A-T from 38 to approximately 52–55.

---

### Technical GEO (81/100)

**Strengths:**
- Fully static HTML — perfect AI crawler visibility, no JS rendering barrier
- robots.txt is exemplary — all major AI crawlers explicitly allowed
- Security headers are comprehensive (HSTS with preload, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- llms.txt present, well-formed, and content-complete
- Cloudflare Pages CDN for performance
- Proper preconnect hints for Google Fonts

**Issues:**
- services.html loads old fonts via synchronous stylesheet (blocking), not the async pattern used on homepage
- services.html theme-color is `#2563eb` (old blue) — inconsistency with `#E9A020` amber brand
- services.html has no JSON-LD
- Sitemap was absent at audit time — **created during this audit** (verify deployment)
- Font Awesome on services.html not in CSP `style-src`
- PWA icon PNG files referenced in manifest.json do not exist

**llms.txt quality:** 72/100 — Present, valid format, covers primary content areas. Plan name inconsistency fixed. Missing: `llms-full.txt` companion, founding date/team info in About section, `dateModified`.

---

### Schema & Structured Data (38/100)

**Schemas present (homepage only):**

| Schema | Status | Issues |
|---|---|---|
| Organization | Present, partial | No `sameAs`; logo is string not ImageObject; ContactPoint missing email |
| WebSite | Present, partial | No `potentialAction`/SearchAction |
| ProfessionalService | Present, partial | Missing `areaServed`, `serviceType`; Offers missing `availability` and `url` |
| FAQPage | Present, valid | Syntax correct; good Q&A content; restricted eligibility (non-authority sites) |

**Missing schemas:**
- `sameAs` on Organization — **critical gap**
- `AggregateRating` on ProfessionalService (5-star claim has no schema backup)
- All structured data on `services.html` — zero JSON-LD on the entire page
- `Review` schema for the three named testimonials
- `speakable` property on any page
- `BreadcrumbList` on services.html
- `Person` schema for any named team member (none exist)

**Recommended immediate fixes (in priority order):**

1. Add `sameAs` to Organization:
```json
"sameAs": [
  "https://www.linkedin.com/company/wpweb",
  "https://www.crunchbase.com/organization/wpweb",
  "https://clutch.co/profile/wpweb"
]
```

2. Fix Organization `logo`:
```json
"logo": {
  "@type": "ImageObject",
  "url": "https://wpweb.org/icons/icon-192.png",
  "width": 192,
  "height": 192
}
```

3. Add `email` to ContactPoint:
```json
"contactPoint": {
  "@type": "ContactPoint",
  "contactType": "customer support",
  "email": "hello@wpweb.org",
  "url": "https://wpweb.org/#contact",
  "availableLanguage": "English"
}
```

4. Add `areaServed` and `serviceType` to ProfessionalService:
```json
"areaServed": {"@type": "Country", "name": "Worldwide"},
"serviceType": "WordPress Management and GEO Optimization"
```

5. Add `dateModified` to all schema blocks:
```json
"dateModified": "2026-03-10"
```

---

### Platform Optimization (38/100)

| Platform | Score | Primary Gap |
|---|---|---|
| Google AI Overviews | 51/100 | No third-party authority; FAQ answers slightly short for AIO extraction |
| Bing Copilot | 44/100 | No Bing Webmaster Tools verification; no LinkedIn (Microsoft-owned) |
| Google Gemini | 35/100 | No Google Business Profile; no YouTube channel; no Knowledge Graph anchor |
| Perplexity AI | 32/100 | No community mentions (Reddit, Quora); no datestamps on content |
| ChatGPT Web Search | 28/100 | No Wikipedia; no Wikidata; no editorial mentions in sources ChatGPT cites |

---

## Quick Wins (Implement This Week)

1. **Add `sameAs` to Organization schema** (once LinkedIn company page exists) — highest single ROI action; unlocks entity recognition across all AI platforms simultaneously
2. **Register Bing Webmaster Tools** (30 minutes) — adds msvalidate.01 meta tag, enables IndexNow, immediate crawl prioritization
3. **Add `dateModified: "2026-03-10"` to all JSON-LD blocks** (15 minutes) — signals content freshness to Perplexity, ChatGPT, Bing Copilot
4. **Fix or link the Georgia Tech/Princeton citation** (30 minutes) — largest individual trust risk; either link directly or rephrase as directional
5. **Add `twitter:image` to homepage and `og:image` + `twitter:image` to services.html** — requires OG image PNG to be created first (see H4)

---

## 30-Day Action Plan

### Week 1: Entity and Brand Infrastructure
- [ ] Create LinkedIn company page for WPWeb (enables sameAs schema + Bing Copilot)
- [ ] Create Clutch profile with company description and service categories
- [ ] Register Bing Webmaster Tools and add verification meta tag
- [ ] Add `sameAs` array to Organization JSON-LD (LinkedIn + Clutch URLs)
- [ ] Fix Georgia Tech/Princeton citation — link or rephrase
- [ ] Add `dateModified` to all JSON-LD blocks

### Week 2: services.html Complete Update
- [ ] Redesign services.html to match new dark design system (Fraunces/Plus Jakarta Sans, amber branding, inline SVGs replacing Font Awesome)
- [ ] Add full Schema.org JSON-LD to services.html (WebPage, BreadcrumbList, Service schemas for each service)
- [ ] Fix services.html footer (copyright 2026, real Privacy/Terms links, correct hamburger semantics)
- [ ] Fix `og:image` and `twitter:image` on services.html
- [ ] Replace broken WordPress logo URL with new inline SVG nav logo

### Week 3: Content and Trust Signals
- [ ] Create `/privacy` and `/terms` pages with full legal document content
- [ ] Create About section on homepage (or dedicated `/about` page) — company founding year, location, named founder/lead
- [ ] Expand FAQ answers to 40–60 words each with direct opening sentences
- [ ] Add `AggregateRating` schema after first Clutch/Trustpilot reviews are collected
- [ ] Create PNG icon files (`icon-192.png`, `icon-512.png`, `og-image.png`)

### Week 4: Content Depth and External Presence
- [ ] Publish one case study page with specific anonymized client metrics
- [ ] Add `speakable` property to homepage WebPage entity
- [ ] Add `Review` schema for the three named testimonials (with real datePublished)
- [ ] Submit a guest post or secure one editorial mention on WPBeginner, Kinsta, or WP Mayor
- [ ] Begin drafting WPWeb Wikipedia article (submit once editorial mentions exist)

---

## Changes Made During This Audit

The following issues were fixed in the repository during the audit session and deployed to Cloudflare Pages:

| Fix | File | Status |
|---|---|---|
| Created `public/sitemap.xml` | `public/sitemap.xml` | ✅ Deployed |
| Fixed plan name consistency ("Starter" → "Basic") | `public/llms.txt` | ✅ Deployed |
| Added sitemap.xml cache headers | `public/_headers` | ✅ Deployed |
| Updated `manifest.json` theme_color to `#E9A020` | `public/manifest.json` | ✅ Deployed |
| Updated manifest.json description to include GEO | `public/manifest.json` | ✅ Deployed |
| Fixed manifest.json icon paths (removed broken WordPress URLs) | `public/manifest.json` | ✅ Deployed |

---

## Appendix: Pages Analyzed

| URL | Title | Key Issues |
|---|---|---|
| https://wpweb.org/ | WPWeb — WordPress Management, Maintenance & GEO Optimization | No sameAs in Organization schema; missing icon PNGs; unverifiable citation; no twitter:image |
| https://wpweb.org/services.html | Our Services - WPWeb WordPress Management & Maintenance | Old design system; broken WordPress logo; Font Awesome CDN; no JSON-LD; stale 2024 copyright; dead footer links; CSP gap |

## Appendix: llms.txt Status

| Check | Status |
|---|---|
| File present at `/llms.txt` | ✅ |
| Correct H1 + blockquote format | ✅ |
| H2 section structure | ✅ |
| Pricing data consistent with homepage | ✅ (fixed during audit) |
| Contact info present | ✅ |
| Key pages linked | ✅ |
| `dateModified` field | ❌ Missing |
| Named personnel | ❌ Missing |
| `llms-full.txt` companion | ❌ Missing |
| Sitemap reference valid | ✅ (sitemap created during audit) |

---

*Report generated by WPWeb GEO Audit System — 2026-03-10*
