
import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

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
    const bookingId = body.bookingId

    if (
      typeof bookingId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)
    ) {
      return NextResponse.json(
        { error: 'Invalid booking ID.' },
        { status: 400 }
      )
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, status, quoted_amount')
      .eq('id', bookingId)
      .eq('customer_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found.' },
        { status: 404 }
      )
    }

    if (
      booking.status !== 'confirmed' ||
      !booking.quoted_amount ||
      Number(booking.quoted_amount) <= 0
    ) {
      return NextResponse.json(
        { error: 'This booking is not eligible for payment.' },
        { status: 400 }
      )
    }

    const { data: existingPayment } = await supabase
      .from('transactions')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('payment_status', 'paid')
      .maybeSingle()

    if (existingPayment) {
      return NextResponse.json(
        { error: 'This booking has already been paid.' },
        { status: 409 }
      )
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay configuration is missing.' },
        { status: 500 }
      )
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const amountInPaise = Math.round(
      Number(booking.quoted_amount) * 100
    )

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `booking_${bookingId.replace(/-/g, '').slice(0, 20)}`,
      notes: {
        bookingId,
        customerId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    })
  } catch (error) {
    console.error('Razorpay order error:', error)

    return NextResponse.json(
      { error: 'Unable to create Razorpay order.' },
      { status: 500 }
    )
  }
}
