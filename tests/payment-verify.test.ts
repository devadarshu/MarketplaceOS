
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  bookingSingle: vi.fn(),
  rpc: vi.fn(),
  orderFetch: vi.fn(),
  paymentFetch: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mocks.bookingSingle,
          })),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mocks.rpc,
  })),
}))

vi.mock('razorpay', () => ({
  default: class {
    orders = { fetch: mocks.orderFetch }
    payments = { fetch: mocks.paymentFetch }
  },
}))

import { POST } from '../app/api/payment/verify/route'

const bookingId = 'cf927a2e-a9bc-486f-97bf-651e7fdc71f7'
const orderId = 'order_test_123'
const paymentId = 'pay_test_123'
const customerId = 'customer-123'
const secret = 'test_secret'

function makeRequest(signature: string) {
  return new Request('http://localhost/api/payment/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }),
  })
}

function validSignature() {
  return createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
}

describe('POST /api/payment/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.RAZORPAY_KEY_ID = 'rzp_test_example'
    process.env.RAZORPAY_KEY_SECRET = secret

    mocks.getUser.mockResolvedValue({
      data: { user: { id: customerId } },
      error: null,
    })

    mocks.bookingSingle.mockResolvedValue({
      data: {
        id: bookingId,
        customer_id: customerId,
        status: 'confirmed',
        quoted_amount: 1000,
      },
      error: null,
    })

    mocks.orderFetch.mockResolvedValue({
      id: orderId,
      amount: 100000,
      currency: 'INR',
      notes: {
        bookingId,
        customerId,
      },
    })

    mocks.paymentFetch.mockResolvedValue({
      order_id: orderId,
      amount: 100000,
      currency: 'INR',
      status: 'captured',
    })

    mocks.rpc.mockResolvedValue({
      data: 'transaction-123',
      error: null,
    })
  })

  it('rejects unauthenticated users', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const response = await POST(makeRequest(validSignature()))

    expect(response.status).toBe(401)
  })

  it('rejects an invalid payment signature', async () => {
    const response = await POST(makeRequest('invalid-signature'))

    expect(response.status).toBe(400)
    expect(mocks.orderFetch).not.toHaveBeenCalled()
  })

  it('rejects invalid payment details', async () => {
    const request = new Request(
      'http://localhost/api/payment/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('records a valid captured payment', async () => {
    const response = await POST(makeRequest(validSignature()))
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.transactionId).toBe('transaction-123')
    expect(mocks.orderFetch).toHaveBeenCalledWith(orderId)
    expect(mocks.paymentFetch).toHaveBeenCalledWith(paymentId)
    expect(mocks.rpc).toHaveBeenCalled()
  })
})
