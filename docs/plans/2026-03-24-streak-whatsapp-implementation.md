# Aardvark Israel: Streak → WhatsApp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a new Box is created in Aardvark Israel's Streak CRM pipeline, automatically send a WhatsApp welcome message to the contact's phone number using the approved Meta message template.

**Architecture:** Streak triggers a Zapier Zap on new Box creation; Zapier calls the Meta Cloud API via Webhooks to send an approved WhatsApp template message with the contact's first name substituted in.

**Tech Stack:** Streak CRM (Gmail), Zapier (Webhooks by Zapier), Meta Cloud API (WhatsApp Business), Meta Business Manager

---

## Prerequisites Checklist (Do First)

Before starting any task, confirm:
- [ ] Client has access to Meta Business Manager (business.facebook.com)
- [ ] Client has a Zapier account (any paid plan — free plan doesn't support Webhooks by Zapier)
- [ ] Streak is installed in Gmail and the leads pipeline has existing Boxes with phone number and name fields
- [ ] The phone number dedicated to WhatsApp Business is NOT currently registered on personal WhatsApp (if it is, it must be migrated first — warn client)

---

### Task 1: Fix tel: Link → WhatsApp on Client Desktop

**Context:** This is the quickest win. Do it first while Meta setup is pending.

**Files:** None — this is a Windows OS setting.

**Step 1: Install WhatsApp Desktop if not already installed**

Go to https://www.whatsapp.com/download and install, OR install from the Microsoft Store. Sign in with the business phone number.

**Step 2: Set WhatsApp as default tel: handler**

1. Press `Win + I` → Settings
2. Type "default apps" in the search bar → click "Default apps"
3. Scroll down to "Choose defaults by protocol" or type `TEL` in the search bar
4. Click **TEL** → select **WhatsApp** from the app list
5. Click **Set default**

**Step 3: Test**

Open Gmail → open a Streak Box with a phone number → click the phone number link.

Expected: WhatsApp Desktop opens with that number pre-filled in a new chat window.

**Step 4: Fallback if WhatsApp doesn't appear in the TEL list**

Install the Chrome extension **"WhatsApp Anywhere"** from the Chrome Web Store. Phone numbers on any webpage (including Streak) will become clickable WhatsApp links.

---

### Task 2: Verify or Create WhatsApp Business Account (WABA)

**Context:** The Meta Cloud API requires a WABA. This may already exist if the client uses WhatsApp Business app.

**Step 1: Check for existing WABA**

1. Go to business.facebook.com → log in with the business Meta account
2. Click the grid icon (All tools) → look for **"WhatsApp Manager"**
3. If it appears → WABA exists, skip to Step 3
4. If it doesn't appear → continue to Step 2

**Step 2: Create WABA (only if needed)**

1. In Meta Business Manager → Business Settings → Accounts → **WhatsApp Accounts**
2. Click **Add** → follow prompts
3. You need: a phone number not on personal WhatsApp, business name, business category
4. Verify the phone number via SMS or call

**Step 3: Note the WABA ID**

In WhatsApp Manager → Settings → Business account info → copy the **WhatsApp Business Account ID**. Save it — needed later.

**Step 4: Note the Phone Number ID**

In WhatsApp Manager → Phone Numbers → click the number → copy the **Phone Number ID** (long numeric string). Save it.

---

### Task 3: Create Meta App and System User Token

**Context:** Zapier needs a permanent access token to call the Meta API. System User tokens don't expire.

**Step 1: Create a Meta App**

1. Go to developers.facebook.com → My Apps → **Create App**
2. Choose **Business** as the app type
3. Name: `Aardvark Zapier Integration` (or similar)
4. Select the business portfolio (Aardvark Israel's Meta Business)
5. Click Create

**Step 2: Add WhatsApp product to the app**

1. Inside the new app → click **Add Product** → find **WhatsApp** → click Set Up
2. You'll be taken to the WhatsApp Getting Started page
3. Link it to your WABA when prompted

**Step 3: Create a System User**

1. In Meta Business Manager → Business Settings → Users → **System Users**
2. Click **Add** → name it `Zapier Bot` → role: **Admin**
3. Click **Add Assets** → WhatsApp Accounts → select your WABA → give Full Control

**Step 4: Generate permanent access token**

1. Click on the System User → **Generate New Token**
2. Select the App you created in Step 1
3. Under permissions, enable:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Set expiry to **Never**
5. Copy the token and store it securely (password manager). **It will not be shown again.**

---

### Task 4: Create and Submit WhatsApp Message Template

**Context:** Meta requires all first-contact outbound messages to use a pre-approved template. Approval typically takes minutes to 72 hours.

**Step 1: Open template manager**

In Meta Business Manager → WhatsApp Manager → Account Tools → **Message Templates** → click **Create Template**

**Step 2: Fill in template details**

- **Category:** Utility
- **Name:** `aardvark_welcome` (lowercase letters and underscores only — no spaces)
- **Language:** English (en_US)

**Step 3: Enter the template body**

In the Body field, enter exactly:

```
Hi {{1}}, thanks for reaching out to Aardvark Israel! We run Gap Year and Semester programs in Israel for Jewish students aged 17-21.
We received your inquiry and will be in touch shortly. In the meantime, feel free to reply here with any questions.
```

`{{1}}` is the variable that will be replaced with the contact's first name. Add a sample value of `David` when prompted.

**Step 4: Submit and wait**

Click **Submit**. Status will show as "Pending" then "Approved" or "Rejected." Check back after 1–2 hours. If rejected, Meta shows a reason — most common reason is "promotional language" (resubmit with Category: Marketing instead of Utility).

**Step 5: Note the exact template name**

Once approved, confirm the template name shows as `aardvark_welcome` in the list. This exact string is used in the Zapier Webhook payload.

---

### Task 5: Identify Streak Pipeline Fields

**Context:** Zapier needs to know exactly which fields in a Streak Box contain the contact's name and phone number.

**Step 1: Open an existing Box in the leads pipeline**

In Gmail → Streak sidebar → open the pipeline used for inquiries → click an existing Box.

**Step 2: Note the field names for name and phone**

Look at the Box fields panel. Identify:
- Which field holds the contact's **first name** (or full name)
- Which field holds the **phone number**

Write these down exactly as they appear. They will show up as variables in Zapier (e.g., `Contact Name`, `Phone`, `Mobile`).

**Step 3: Check phone number format in existing Boxes**

Look at a few phone numbers already in Streak. Note whether they include country code, `+`, spaces, or dashes. The Meta API requires digits only with country code and no `+` (e.g., `972501234567`). Zapier will need a formatter step if the numbers aren't in this format.

---

### Task 6: Build the Zapier Zap

**Context:** This is the core automation. Build it in Zapier's editor step by step.

**Step 1: Create a new Zap**

Log into Zapier → click **Create Zap**

**Step 2: Set up the Trigger — Streak: New Box**

1. Search for and select **Streak** as the trigger app
2. Event: **New Box**
3. Connect your Streak account (OAuth — sign in with Gmail)
4. Select the pipeline: choose the Aardvark Israel inquiries/leads pipeline
5. Test the trigger — Zapier will pull a recent Box as sample data
6. Confirm you can see the name and phone fields from Task 5 in the sample data

**Step 3: Add a Filter (guard against missing phone)**

1. Click the `+` between trigger and next step → add a **Filter** (built-in Zapier tool)
2. Rule: Only continue if **[phone field]** exists / is not empty
3. This prevents the Zap from erroring when a Box has no phone number

**Step 4: Add a Formatter step (if phone numbers need cleaning)**

If phone numbers in Streak include `+`, spaces, or dashes:
1. Add a **Formatter by Zapier** step
2. Event: **Numbers** → **Format Phone Number**
3. Input: the phone field from Streak
4. Output format: select digits only, with country code
5. Use this formatted number in the Webhook step (Step 5)

If numbers are already clean (e.g., `972501234567`), skip this step.

**Step 5: Add the Action — Webhooks by Zapier: POST**

1. Search for **Webhooks by Zapier**
2. Event: **POST**
3. URL:
   ```
   https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID/messages
   ```
   Replace `YOUR_PHONE_NUMBER_ID` with the ID noted in Task 2, Step 4.

4. Payload Type: **JSON**

5. Data (key-value pairs — enter each key/value separately in Zapier):

   | Key | Value |
   |-----|-------|
   | `messaging_product` | `whatsapp` |
   | `to` | *(phone number field from Streak or Formatter)* |
   | `type` | `template` |
   | `template.name` | `aardvark_welcome` |
   | `template.language.code` | `en_US` |
   | `template.components[0].type` | `body` |
   | `template.components[0].parameters[0].type` | `text` |
   | `template.components[0].parameters[0].text` | *(first name field from Streak)* |

   > **Note on nested JSON:** Zapier's key-value interface doesn't support deeply nested JSON well. Switch the Data mode to **Raw** and paste the full JSON body instead:

   ```json
   {
     "messaging_product": "whatsapp",
     "to": "{{phone_number}}",
     "type": "template",
     "template": {
       "name": "aardvark_welcome",
       "language": { "code": "en_US" },
       "components": [
         {
           "type": "body",
           "parameters": [
             { "type": "text", "text": "{{first_name}}" }
           ]
         }
       ]
     }
   }
   ```
   Replace `{{phone_number}}` and `{{first_name}}` with the actual Zapier dynamic fields from Streak.

6. Headers:
   | Key | Value |
   |-----|-------|
   | `Authorization` | `Bearer YOUR_SYSTEM_USER_TOKEN` |
   | `Content-Type` | `application/json` |

**Step 6: Test the Webhook step**

Click **Test step** in Zapier. Expected: a 200 response with `"messages": [{"id": "..."}]` in the body. If you get a 400 or 401, check the token and Phone Number ID.

**Step 7: Verify delivery**

Open WhatsApp on the test phone number. The welcome message should appear within seconds.

**Step 8: Name and publish the Zap**

Name it `Aardvark: New Lead → WhatsApp Welcome`. Turn it **ON**.

---

### Task 7: End-to-End Test

**Step 1: Simulate a new lead**

In Streak, manually create a new Box in the leads pipeline with:
- A real phone number you can receive messages on
- A first name
- Fill in all required fields

**Step 2: Verify Zap runs**

In Zapier → Zap History → confirm a new run appears with status **Success**.

**Step 3: Verify WhatsApp delivery**

Check the test phone — the welcome message should arrive within 30 seconds.

**Step 4: Check Meta delivery logs (optional)**

In Meta Business Manager → WhatsApp Manager → Insights → Messages sent/delivered — confirm the message shows as delivered.

**Step 5: Test the filter**

Create another Box with no phone number. Confirm the Zap run shows as **Filtered** (not Error).

---

### Task 8: Document Setup for Client Handoff

**Files:**
- Create: `docs/plans/aardvark-whatsapp-credentials.md` (private, gitignored — or store in password manager)

**Step 1: Record all credentials and IDs**

Store securely (not in git):
- Meta App ID
- WABA ID
- Phone Number ID
- System User name
- Token storage location (password manager entry name)
- Template name: `aardvark_welcome`
- Zapier Zap name and URL

**Step 2: Note the Zapier plan requirement**

Webhooks by Zapier requires a **paid Zapier plan** (Starter or above). Confirm the client's plan supports it. If on a free plan, upgrade or consider Make.com as an alternative.

---

## Known Limitations

- **Number must be on WhatsApp:** Meta returns a 200 OK even if the number isn't registered on WhatsApp — the message just won't be delivered. There is no programmatic way to check this before sending without a separate WhatsApp number lookup service.
- **Template must stay approved:** If the template is flagged or disabled by Meta, messages will silently fail. Check WhatsApp Manager monthly.
- **First message only:** After the contact replies, freeform messages can be sent within a 24-hour window. Template messages are only needed for cold outreach.
- **Phone number format:** Must be international digits only, no `+`. A Zapier Formatter step handles this if Streak stores numbers with formatting.
