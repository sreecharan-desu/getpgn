# Organizer Plan — Prepaid Scan Wallet (Razorpay Orders)

Tournament organizers buy **custom scan credits** at **₹1/scan** (minimum **4,000** scans) via **Razorpay Orders API** — not subscriptions.

## Pricing

| Rule | Value |
|------|--------|
| Price per scan | ₹1 |
| Minimum purchase | 4,000 scans |
| Default UI preset | 4,000 scans = ₹4,000 |
| Custom quantities | Any integer ≥ 4,000 |

## Database

Run before deploy:

```bash
npm run db:sync
npm run db:check
```

### New tables

- **`organizer_accounts`** — wallet: `available_scans`, `total_scans_purchased`, `total_scans_used`
- **`organizer_purchases`** — checkout rows: `scans_purchased`, `amount`, `razorpay_order_id`, `razorpay_payment_id`, `status`

## APIs

| Endpoint | Description |
|----------|-------------|
| `POST /api/organizer/order/create` | Create Razorpay order + pending purchase |
| `POST /api/organizer/order/verify` | HMAC verify `order_id\|payment_id`, credit wallet |
| `GET /api/organizer/account` | Balance + purchase history |
| `GET /api/admin/organizers` | Admin: balances + purchases (`Authorization: Bearer ADMIN_API_KEY`) |
| `POST /api/admin/organizers/[userId]/credit` | Admin: manual scan credit |

## Razorpay

### Checkout flow (Standard / Orders)

1. Server: `POST /v1/orders` with `amount` in **paise** (`scans × 100`)
2. Client: Razorpay Checkout with `order_id` (not `subscription_id`)
3. Server verify: HMAC `razorpay_order_id + "|" + razorpay_payment_id`
4. Webhooks (idempotent): `payment.captured`, `order.paid`

### Webhook events

Enable in Razorpay Dashboard:

- `payment.captured`
- `order.paid`
- (existing subscription events unchanged)

Uses the same `RAZORPAY_WEBHOOK_SECRET`.

## Scan consumption

On each successful PGN extract/validate:

1. If organizer wallet `available_scans > 0` → deduct 1 (atomic)
2. Else fall back to Pro/Free quota logic

Wallet users with zero credits see: *"Organizer scan credits exhausted. Purchase more scans to continue."*

## Library access

Public organizer library (`/library/[slug]`) is available when:

- Legacy **Enterprise** subscription is active, **or**
- User has **completed at least one** organizer scan purchase

## UI

| Route | Purpose |
|-------|---------|
| `/organizer` | Buy custom scan packs |
| `/admin/organizers` | Ops dashboard (API key) |
| Account → Profile | Wallet balance + library panel |

## Environment

```env
# Existing Razorpay keys (required)
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Admin (optional — for /admin/organizers + credit API)
ADMIN_API_KEY=your-long-random-secret
```

## Security

- Credits only from verified payments (signature + webhook idempotency)
- `razorpay_payment_id` unique on completed purchases
- Order `notes.product = organizer_scans` + `notes.userId` on create
- Admin routes require `ADMIN_API_KEY`
