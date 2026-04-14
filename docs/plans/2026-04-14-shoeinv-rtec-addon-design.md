# Design: Shoe Inventory RTEC Addon

**Date:** 2026-04-14  
**Site:** cosherfit.com  
**Replaces:** `shoe-inventory` WPForms plugin

---

## Problem

Shoe-inventory events (ג'אמפ, קנגו) currently require three separate Events Calendar events per session (one per shoe-size range) plus a fourth "ללא נעליים" event. This is a workaround because RTEC has no per-resource inventory concept. Registrants must find and register for the correct size event rather than choosing a size during a single registration.

## Solution

A plugin (`shoeinv-rtec-addon`) that layers shoe-size inventory tracking onto RTEC + Events Calendar. Registration stays entirely within RTEC — we add one shoe-size dropdown to the form and one atomic reserve step to the submission.

---

## What changes vs. current plugin

| Current (`shoe-inventory`) | New (`shoeinv-rtec-addon`) |
|---|---|
| WPForms integration | RTEC integration |
| Manual session management + admin UI | Events Calendar **is** the session system |
| `shoeinv_sessions` table | Dropped — use `tribe_events` post ID |
| `shoeinv_stock.session_id` | Renamed to `event_id` |
| Separate form for shoe events | Shoe size field injected into RTEC form |

Kept as-is: atomic SQL reserve/rollback, `shoeinv_stock`, `shoeinv_reservations`, `shoeinv_audit`.

---

## Event identification

A meta box on the `tribe_events` edit screen titled **"מלאי נעליים"**:

- Checkbox: **"הפעל מלאי נעליים לאירוע זה"**
- When checked: one integer stock field per size from the global size list
- Stored as post meta `_shoeinv_enabled` (bool) and `_shoeinv_stock` (serialized array, e.g. `{'35-37': 1, '38-40': 3, '41-43': 2}`)

No hardcoded title matching. Any event type can have inventory enabled.

---

## Form injection

When RTEC renders its registration form on an inventory-enabled event:

- A `<select>` dropdown for shoe size is injected into the form (via RTEC template override or filter)
- Field is required
- Sold-out sizes are rendered disabled with `(אזל המלאי)` appended — updated in real time via AJAX before submit
- BYOS option (`אביא נעליים משלי`, value `BYOS`) is always available; selecting it skips inventory reserve

---

## Submission flow

```
User submits RTEC form
  └─ Our hook fires BEFORE RTEC saves entry
       ├─ Extract shoe_size from POST
       ├─ If BYOS → skip inventory, let RTEC proceed
       ├─ atomic_reserve(event_id, shoe_size)
       │    ├─ rows_affected = 1 → reserve held, continue
       │    └─ rows_affected = 0 → set RTEC error "מידה זו אזלה", abort
       └─ RTEC saves entry (shoe_size written to `custom` column as JSON)
            └─ rtec_after_registration_submit fires
                 └─ confirm_reservation(entry_id, event_id, shoe_size)

If any later step fails after reserve:
  └─ rollback_reserve(event_id, shoe_size)

When RTEC cancellation link used (registrant unregisters):
  └─ delete_reservation_by_entry(entry_id)
       └─ decrements reserved_count
```

---

## Data model changes

`shoeinv_stock`: `session_id` column renamed to `event_id` (references `tribe_events` post ID).

`shoeinv_sessions` table: **dropped** (Events Calendar replaces it).

All other tables (`shoeinv_reservations`, `shoeinv_audit`) unchanged.

Global size list and max class size remain in `shoeinv_settings` option.

---

## File structure

```
shoeinv-rtec-addon/
├── shoeinv-rtec-addon.php         # Bootstrap, dependency check
├── uninstall.php                  # Drop tables, delete options
├── includes/
│   ├── class-activator.php        # dbDelta: stock/reservations/audit tables
│   ├── class-db.php               # Atomic reserve/rollback, inventory queries
│   ├── class-rtec-integration.php # Form injection + submission interception
│   └── class-admin.php            # Meta box on tribe_events edit screen
└── assets/
    ├── admin.js                   # Meta box stock fields UX
    ├── admin.css
    └── frontend.js                # Real-time sold-out disabling on RTEC form
```

---

## Migration

No data migration required. The four workaround events (35-37 / 38-40 / 41-43 / ללא נעליים) remain in place for historical registrations and are simply not given new recurrences. New ג'אמפ / קנגו events are created normally in Events Calendar with inventory enabled via the meta box.

The `shoe-inventory` WPForms plugin can be deactivated once the first new event is live.

---

## Out of scope (v1)

- Waitlists
- Email notification of shoe reservation details (RTEC confirmation email already fires)
- Multi-resource inventory (only shoes)
- Front-end "my reservation" page
