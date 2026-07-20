# 📱 DLT SMS Templates — Cursive Letters

> **Submit these exact templates to your DLT portal.**
> After registration, copy the **DLT Template ID** for each template into your `.env` file.

---

## Template 1 — Login / Signup OTP

**Use when:** User signs up and needs to verify their mobile number.

**DLT Template Text (copy exactly):**
```
Your OTP for Cursive Letters verification is {#var#}. Valid for 10 minutes. Do not share with anyone. - Cursive Letters
```

**Variables:**
| Position | Variable | Example Value |
|----------|----------|---------------|
| 1 | `{#var#}` | `847293` (6-digit OTP) |

**Character count:** ~118 chars (1 SMS credit)

**`.env` key:** `SMS_TEMPLATE_OTP`

---

## Template 2 — Order Accepted (Admin Acceptance)

**Use when:** Admin sets order status to **accepted** from the admin panel.

**DLT Template ID:** `1777178447542965101`

**DLT Template Text (copy exactly):**
```
Dear {#var#}, your order No.{#var#} has been successfully accepted. You can view your order details on our website. We will process your order for dispatch shortly. Thank you for shopping with us. Cursive Letters LY
```

**Variables:**
| Position | Variable | Example Value |
|----------|----------|---------------|
| 1 | `{#var#}` | `Rahul` (Customer name) |
| 2 | `{#var#}` | `ORD_1720000000_ABC123` (Order ID) |

**Character count:** ~183 chars (1 SMS credit)

**`.env` key:** `SMS_TEMPLATE_ACCEPTED`

---

## Template 3 — Order Dispatched (with AWB)

**Use when:** Admin dispatches an order via `POST /api/order/admin/:orderID/dispatch`.

**DLT Template Text (copy exactly):**
```
Dear {#var#}, your order {#var#} has been dispatched via {#var#}. AWB No: {#var#}. Track your shipment with the courier. - Cursive Letters
```

**Variables:**
| Position | Variable | Example Value |
|----------|----------|---------------|
| 1 | `{#var#}` | `Priya` (Customer name) |
| 2 | `{#var#}` | `ORD_1720000000_XYZ789` (Order ID) |
| 3 | `{#var#}` | `Delhivery` (Courier company name) |
| 4 | `{#var#}` | `1234567890123` (AWB / Tracking number) |

**Character count:** ~141 chars (1 SMS credit)

**`.env` key:** `SMS_TEMPLATE_DISPATCH`

---

## Template 4 — Forgot Password

**Use when:** User requests a password reset link.

**DLT Template Text (copy exactly):**
```
Dear {#var#}, click the link below to reset your Cursive Letters account password. Link: {#var#} This link is valid for 1 hour. - Cursive Letters
```

**Variables:**
| Position | Variable | Example Value |
|----------|----------|---------------|
| 1 | `{#var#}` | `Amit` (Customer name) |
| 2 | `{#var#}` | `https://cursiveletters.in/reset-password?token=abc123...` (Reset URL) |

> **Note:** This SMS will be ~200+ characters with a full URL (2 SMS credits). If you want to save credits, use a URL shortener or a short custom domain link in the template.

**`.env` key:** `SMS_TEMPLATE_FORGOT`

---

## Post-Registration: Fill `.env`

After DLT approval, update `/backend/.env`:

```env
# SMS GATEWAY (SMSGatewayHub)
SMS_API_KEY=your_api_key_here
SMS_SENDER_ID=CURSLY          # Your 6-char approved sender ID
SMS_ENTITY_ID=your_entity_id  # Your DLT Entity ID

# DLT Template IDs (fill after DLT registration)
SMS_TEMPLATE_OTP=1777178411219440996
SMS_TEMPLATE_RESET_OTP=1777178411690264265
SMS_TEMPLATE_CONFIRMED=1777178447542965101
SMS_TEMPLATE_ACCEPTED=1777178447542965101
SMS_TEMPLATE_DISPATCH=1777178417937552272
```

---

## Dispatch API — How to use

The admin panel should call this endpoint when dispatching an order:

**Endpoint:** `POST /api/order/admin/:orderID/dispatch`
**Auth:** Admin JWT required

**Request Body:**
```json
{
  "awbNumber": "1234567890123",
  "companyName": "Delhivery"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order dispatched and SMS sent",
  "data": {
    "orderID": "ORD_1720000000_XYZ789",
    "awbNumber": "1234567890123",
    "companyName": "Delhivery"
  }
}
```

This endpoint will:
1. Set orderStatus to dispatched
2. Save AWB and courier info in admin_notes
3. Fire the dispatch SMS to the customer's delivery phone (non-blocking)

---

## SMS Trigger Summary

| Event | Trigger Point | Phone Used |
|-------|--------------|------------|
| OTP | otpService.sendOTP(email, name, phone) | Phone passed from signup form |
| Order Placed | POST /:uid/place-order (customer checkout) | addressPhone, fallback user.phoneNumber |
| Order Accepted | PUT /api/order/admin/:orderID/status with "accepted" | addressPhone, fallback user.phoneNumber |
| Dispatched | POST /api/order/admin/:orderID/dispatch | addressPhone, fallback user.phoneNumber |
| Forgot Password | POST /api/auth/request-password-reset | user.phoneNumber from DB |
