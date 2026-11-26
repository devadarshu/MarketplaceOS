
import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please log in first.' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body

    if (
      typeof bookingId !== 'string' ||
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid payment details.' },
        { status: 400 }
      )
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keySecret) {
      return NextResponse.json(
        { error: 'Razorpay configuration is missing.' },
        { status: 500 }
      )
    }

    // Verify Razorpay Checkout signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const received = Buffer.from(razorpay_signature, 'hex')
    const expected = Buffer.from(expectedSignature, 'hex')

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return NextResponse.json(
        { error: 'Payment signature verification failed.' },
        { status: 400 }
      )
    }

    // Verify customer owns the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, status, quoted_amount')
      .eq('id', bookingId)
      .eq('customer_id', user.id)
      .single()

    if (
      bookingError ||
      !booking ||
      booking.status !== 'confirmed' ||
      !booking.quoted_amount ||
      Number(booking.quoted_amount) <= 0
    ) {
      return NextResponse.json(
        { error: 'Invalid or unauthorized booking.' },
        { status: 400 }
      )
    }

    // Verify order and payment directly with Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: keySecret,
    })

    const order = await razorpay.orders.fetch(razorpay_order_id)
    const payment = await razorpay.payments.fetch(razorpay_payment_id)

    const expectedAmount = Math.round(
      Number(booking.quoted_amount) * 100
    )

    if (
      order.id !== razorpay_order_id ||
      order.amount !== expectedAmount ||
      order.currency !== 'INR' ||
      order.notes?.bookingId !== bookingId ||
      order.notes?.customerId !== user.id ||
      payment.order_id !== razorpay_order_id ||
      payment.amount !== expectedAmount ||
      payment.currency !== 'INR' ||
      payment.status !== 'captured'
    ) {
      return NextResponse.json(
        { error: 'Razorpay payment could not be verified as captured.' },
        { status: 400 }
      )
    }

    // Save only after successful server-side verification
    const admin = createAdminClient()

    const { data: transactionId, error: saveError } = await admin.rpc(
      'record_razorpay_payment',
      {
        p_booking_id: bookingId,
        p_customer_id: user.id,
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_amount: Number(booking.quoted_amount),
      }
    )

    if (saveError) {
      console.error('Payment database error:', saveError)

      return NextResponse.json(
        { error: saveError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transactionId,
      message: 'Payment verified and recorded successfully.',
    })
  } catch (error) {
    console.error('Payment verification error:', error)

    return NextResponse.json(
      { error: 'Unable to verify payment. Please contact support.' },
      { status: 500 }
    )
  }
}
