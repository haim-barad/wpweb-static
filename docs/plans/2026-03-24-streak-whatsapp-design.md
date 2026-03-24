# Aardvark Israel: Streak CRM → WhatsApp Automation Design

**Date:** 2026-03-24
**Client:** Aardvark Israel (aardvarkisrael.com)
**Status:** Approved — implementing Zapier phase first

---

## Problem

When a prospective student fills in the Aardvark Israel contact form, their details are saved in Streak CRM (Gmail-integrated). The client previously clicked phone numbers in Streak to open WhatsApp. This broke because Streak formats numbers as `tel:` links, which open a phone dialer instead of WhatsApp.

Two separate needs:
1. Fix the click-to-WhatsApp behavior on the client's desktop
2. Automate a WhatsApp welcome message when a new lead enters Streak

---

## Part 1: tel: Link Fix (Desktop)

**Approach:** Set WhatsApp Desktop as the default handler for the `tel:` URI scheme in Windows.

**Steps for the client:**
1. Install WhatsApp Desktop (Microsoft Store or whatsapp.com/download)
2. Open **Settings** (Win+I) → search **"Default apps"**
3. Scroll to **TEL** in the list of protocol handlers
4. Select **WhatsApp** from the app picker

Result: every `tel:` link in Streak, Gmail, or any browser opens WhatsApp Desktop with the number pre-filled.

**Fallback (if on a managed machine):** Install the *WhatsApp Anywhere* Chrome extension — intercepts `tel:` clicks inside Chrome and redirects to `wa.me/` links.

---

## Part 2: Zapier Automation — New Lead → WhatsApp Welcome

### Overview

When a new Box is created in a Streak pipeline, Zapier automatically sends an approved WhatsApp template message to the contact's phone number.

### Architecture

```
Streak: New Box created
  → [Zapier] Extract: contact name + phone number from Box fields
  → [Webhooks by Zapier] POST to Meta Cloud API
  → WhatsApp: template message delivered to contact
```

### Prerequisites

#### A. WhatsApp Business Account (WABA) in Meta Business Manager
- Log into business.facebook.com
- Confirm "WhatsApp Manager" appears in tools (means WABA exists)
- If not: set up WABA — requires a dedicated phone number not registered on personal WhatsApp

#### B. Meta App + System User Token
1. Go to developers.facebook.com → create a new App (type: Business)
2. Add the **WhatsApp** product to the app
3. In Business Manager → System Users → create a System User
4. Assign the System User admin access to the WABA
5. Generate a **permanent access token** with `whatsapp_business_messaging` permission
6. Note the **Phone Number ID** (found in WhatsApp Manager → Phone Numbers)

#### C. Approved Message Template
- In Meta Business Manager → WhatsApp Manager → Account tools → **Message Templates**
- Click **Create template**
  - Category: **Utility**
  - Name: `aardvark_welcome` (lowercase, underscores only)
  - Language: English (en_US)
  - Body:
    ```
    Hi {{1}}, thanks for reaching out to Aardvark Israel! We run Gap Year and Semester programs in Israel for Jewish students aged 17-21.
    We received your inquiry and will be in touch shortly. In the meantime, feel free to reply here with any questions.
    ```
- Submit and wait for approval (minutes to 72 hours)

### Zapier Zap Configuration

**Step 1 — Trigger: Streak**
- App: Streak
- Event: New Box
- Pipeline: [select the leads/inquiries pipeline]
- Connect Streak account via OAuth

**Step 2 — Action: Webhooks by Zapier**
- Event: POST
- URL: `https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`
- Payload type: JSON
- Headers:
  ```
  Authorization: Bearer {SYSTEM_USER_TOKEN}
  Content-Type: application/json
  ```
- Body:
  ```json
  {
    "messaging_product": "whatsapp",
    "to": "{phone_number_from_streak}",
    "type": "template",
    "template": {
      "name": "aardvark_welcome",
      "language": { "code": "en_US" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "{first_name_from_streak}" }
          ]
        }
      ]
    }
  }
  ```

**Phone number format:** Must be international format, digits only, no `+` or spaces (e.g., `15551234567` for US, `972501234567` for Israel).

### Error Handling
- If phone number is missing from the Streak Box, the Zap will fail silently — add a **Filter** step after the trigger to only proceed if the phone field is non-empty
- Meta returns a 200 with error body (not HTTP error) if the number isn't on WhatsApp — Zapier won't flag this as a failure; check Meta's message logs in WhatsApp Manager if delivery is suspected to be failing

---

## Part 3: Agent (Future Scope)

Phase 2 enhancement: Add a Claude API step in the Zapier flow to generate a personalized message based on full Streak Box fields (inquiry text, program interest, age). Phase 3: replace Zapier with a custom Claude agent that monitors WhatsApp replies and auto-answers FAQs (program dates, cost, eligibility) before handing off to the human.

---

## Open Questions
- [ ] Does the client have an existing WABA, or does one need to be created?
- [ ] What Streak pipeline/fields contain the contact's phone number and name?
- [ ] Does the client have a Zapier account (and what plan tier)?
