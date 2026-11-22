
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verify logged-in user
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

    // Read booking ID
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

    // Call the secure database function
    const { data, error } = await supabase.rpc(
      'create_demo_payment',
      { p_booking_id: bookingId }
    )
    
    if (error) {
  const message = error.message.includes('invalid input syntax')
    ? 'Invalid booking ID.'
    : error.message

  return NextResponse.json(
    { error: message },
    { status: 400 }
  )
}

    

    const payment = data?.[0]

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment could not be created.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transactionId: payment.transaction_id,
      amount: payment.paid_amount,
      reference: payment.payment_reference,
    })
  } catch {
    return NextResponse.json(
      { error: 'Unable to process demo payment.' },
      { status: 500 }
    )
  }
}
