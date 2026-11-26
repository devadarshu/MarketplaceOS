
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  bookingSingle: vi.fn(),
  paymentMaybeSingle: vi.fn(),
  ordersCreate: vi.fn(),
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
            maybeSingle: mocks.paymentMaybeSingle,
          })),
        })),
      })),
    })),
  })),
}))





vi.mock('razorpay', () => ({
  default: class {
    orders = {
      create: mocks.ordersCreate,
    }
  },
}))

import { POST } from '../app/api/payment/route'

describe('POST /api/payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.RAZORPAY_KEY_ID = 'rzp_test_example'
    process.env.RAZORPAY_KEY_SECRET = 'test_secret'
  })

  it('returns 401 when the customer is not logged in', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const request = new Request('http://localhost/api/payment', {
      method: 'POST',
      body: JSON.stringify({ bookingId: '123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('returns 400 for an invalid booking ID', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'customer-123' } },
      error: null,
    })

    const request = new Request('http://localhost/api/payment', {
      method: 'POST',
      body: JSON.stringify({ bookingId: 'invalid-id' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 404 when the booking does not exist', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'customer-123' } },
      error: null,
    })

    mocks.bookingSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const request = new Request('http://localhost/api/payment', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: 'cf927a2e-a9bc-486f-97bf-651e7fdc71f7',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)

    expect(response.status).toBe(404)
  })

  it('creates an order for a confirmed booking', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'customer-123' } },
      error: null,
    })

    mocks.bookingSingle.mockResolvedValue({
      data: {
        id: 'cf927a2e-a9bc-486f-97bf-651e7fdc71f7',
        customer_id: 'customer-123',
        status: 'confirmed',
        quoted_amount: 1000,
      },
      error: null,
    })

    mocks.paymentMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })

    mocks.ordersCreate.mockResolvedValue({
      id: 'order_test_123',
      amount: 100000,
      currency: 'INR',
    })

    const request = new Request('http://localhost/api/payment', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: 'cf927a2e-a9bc-486f-97bf-651e7fdc71f7',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.orderId).toBe('order_test_123')
    expect(result.amount).toBe(100000)
    expect(result.currency).toBe('INR')
    expect(mocks.ordersCreate).toHaveBeenCalled()
  })
})
