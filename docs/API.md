# MarketplaceOS API Documentation

**Project:** MarketplaceOS  
**Version:** 1.0  
**Environment:** Production  
**Base URL:** https://marketplace-os-eight.vercel.app

## 1. Introduction

MarketplaceOS provides API endpoints for payment processing, payment verification, email testing, and file uploads.

The application uses Next.js API routes, Supabase authentication and storage, Razorpay payments, and Resend email services.

## 2. Authentication

All four endpoints require an authenticated user session.

Authentication is handled through Supabase Auth cookies.

Unauthenticated requests return:

**HTTP 401 Unauthorized**

```json
{
  "error": "Please log in first."
}
```

## 3. API Endpoints

### 3.1 Create Payment Order

**Endpoint:** `/api/payment`

**Method:** POST

**Purpose:** Creates a Razorpay payment order for an eligible booking.

**Request Body:**

```json
{
  "bookingId": "YOUR-BOOKING-UUID"
}
```

**Processing:**
- Verifies the user's authentication.
- Applies a limit of 5 requests per user per minute.
- Validates the booking UUID.
- Checks booking ownership and confirmation status.
- Prevents payment order creation for already-paid bookings.
- Creates a Razorpay order in INR.

**Success Response — HTTP 200**

```json
{
  "success": true,
  "orderId": "razorpay_order_id",
  "amount": 4500000,
  "currency": "INR",
  "keyId": "razorpay_public_key_id"
}
```

**Possible Error Codes:**

| Status | Description |
|---|---|
| 400 | Invalid booking ID or booking not eligible |
| 401 | User not authenticated |
| 404 | Booking not found |
| 409 | Booking already paid |
| 429 | Rate limit exceeded |
| 500 | Payment configuration or server error |

### 3.2 Verify Payment

**Endpoint:** `/api/payment/verify`

**Method:** POST

**Purpose:** Verifies a Razorpay payment and records the successful transaction.

**Request Body:**

```json
{
  "bookingId": "YOUR-BOOKING-UUID",
  "razorpay_order_id": "order_example",
  "razorpay_payment_id": "payment_example",
  "razorpay_signature": "signature_example"
}
```

**Processing:**
- Checks user authentication.
- Validates the payment details.
- Verifies the Razorpay HMAC-SHA256 signature.
- Checks booking ownership and confirmation.
- Fetches the order and payment directly from Razorpay.
- Validates amount, currency, booking and customer details.
- Confirms that the payment status is captured.
- Records the transaction in Supabase.

**Success Response — HTTP 200**

```json
{
  "success": true,
  "transactionId": "transaction_id",
  "message": "Payment verified and recorded successfully."
}
```

**Possible Error Codes:**

| Status | Description |
|---|---|
| 400 | Invalid details, failed verification, or database save error |
| 401 | User not authenticated |
| 500 | Configuration or server error |

### 3.3 Send Test Email

**Endpoint:** `/api/email/test`

**Method:** POST

**Purpose:** Tests email integration using Resend.

**Request Body:** None required.

**Processing:**
- Checks user authentication.
- Reads the configured Resend API key.
- Sends a predefined test email.
- Uses the configured test recipient.

**Success Response — HTTP 200**

```json
{
  "success": true,
  "message": "Test email sent successfully!",
  "emailId": "resend_email_id"
}
```

**Possible Error Codes:**

| Status | Description |
|---|---|
| 400 | Resend email service error |
| 401 | User not authenticated |
| 500 | Missing configuration or server error |

**Note:** This endpoint is for integration testing. It does not currently provide general customer notification functionality.

### 3.4 Upload File

**Endpoint:** `/api/upload`

**Method:** POST

**Purpose:** Uploads files to private Supabase Storage.

**Content-Type:** `multipart/form-data`

**Request Parameter:**

| Parameter | Type | Required |
|---|---|---|
| file | File | Yes |

**Allowed File Types:**
- JPG / JPEG
- PNG
- WEBP
- PDF

**Maximum File Size:** 10 MB

**Processing:**
- Checks user authentication.
- Validates the uploaded file.
- Checks file size and MIME type.
- Generates a unique file name.
- Stores the file in the private `marketplace-files` bucket.
- Places the file under the authenticated user's folder.

**Success Response — HTTP 200**

```json
{
  "success": true,
  "message": "File uploaded successfully!",
  "path": "user_id/generated_filename.png"
}
```

**Possible Error Codes:**

| Status | Description |
|---|---|
| 400 | Missing file, invalid file, or storage upload failure |
| 401 | User not authenticated |
| 500 | Server error |

## 4. Security Measures

MarketplaceOS implements the following security measures:

1. Supabase authentication for protected API endpoints.
2. Server-side environment variables for private credentials.
3. Razorpay payment signature verification using HMAC-SHA256.
4. Timing-safe signature comparison.
5. Booking ownership and payment status validation.
6. Payment request rate limiting using Upstash Redis.
7. File size and MIME type validation.
8. Private Supabase Storage uploads.
9. HTTPS through the production deployment.

## 5. External Integrations

| Service | Purpose |
|---|---|
| Supabase | Authentication, database and file storage |
| Razorpay | Payment order creation and verification |
| Resend | Email integration testing |
| Upstash Redis | Payment API rate limiting |
| Vercel | Production hosting and deployment |

## 6. Production Information

**Application:** https://marketplace-os-eight.vercel.app

**GitHub Repository:** https://github.com/devadarshu/MarketplaceOS

**API Base URL:** https://marketplace-os-eight.vercel.app

All private API credentials are stored as environment variables and must not be exposed in documentation or source control.

## 7. Conclusion

MarketplaceOS provides protected API endpoints for its major integration workflows. Authentication, payment verification, request validation, rate limiting and file upload restrictions help improve the application's security and reliability.