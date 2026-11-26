
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Booking = {
  id: string
  event_date: string
  event_location: string
  status: string
  quoted_amount: number | null
}

type RazorpayResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  modal: {
    ondismiss: () => void
  }
  theme: {
    color: string
  }
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void
    }
  }
}

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadBooking() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      if (
        !bookingId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)
      ) {
        setError('Invalid or missing booking ID.')
        setLoading(false)
        return
      }

      const { data, error: bookingError } = await supabase
        .from('bookings')
        .select('id, event_date, event_location, status, quoted_amount')
        .eq('id', bookingId)
        .eq('customer_id', user.id)
        .single()

      if (bookingError || !data) {
        setError('Booking not found.')
      } else if (
        data.status !== 'confirmed' ||
        !data.quoted_amount ||
        Number(data.quoted_amount) <= 0
      ) {
        setError('Only confirmed bookings with a valid quotation can be paid.')
      } else {
        setBooking(data)
      }

      setLoading(false)
    }

    loadBooking()
  }, [bookingId, router])

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)

      document.body.appendChild(script)
    })
  }

  async function makePayment() {
    if (!booking || paying) return

    setPaying(true)
    setError('')
    setNotice('')

    try {
      const loaded = await loadRazorpayScript()

      if (!loaded) {
        setError('Unable to load Razorpay Checkout. Please try again.')
        return
      }

      // Create order on our secure server
      const orderResponse = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: booking.id }),
      })

      const order = await orderResponse.json()

      if (!orderResponse.ok) {
        setError(order.error || 'Unable to create payment order.')
        return
      }

      const options: RazorpayOptions = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'MarketplaceOS',
        description: 'Event Booking Payment',
        order_id: order.orderId,

        handler: async (paymentResponse) => {
          try {
            setError('')
            setNotice('Verifying your payment...')

            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId: booking.id,
                ...paymentResponse,
              }),
            })

            const verification = await verifyResponse.json()

            if (!verifyResponse.ok) {
              setNotice('')
              setError(
                verification.error ||
                  'Payment verification failed. Please contact support.'
              )
              setPaying(false)
              return
            }

            setNotice(
              'Payment successful and verified! Your transaction has been recorded.'
            )
            setPaying(false)
          } catch {
            setNotice('')
            setError(
              'Unable to verify payment. Please contact support before trying again.'
            )
            setPaying(false)
          }
        },

        modal: {
          ondismiss: () => {
            setPaying(false)
          },
        },

        theme: {
          color: '#16a34a',
        },
      }

      const checkout = new window.Razorpay(options)
      checkout.open()
    } catch (err) {
      console.error('Payment error:', err)
      setError('Unable to start payment. Please try again.')
    } finally {
      // Razorpay Checkout remains open after this function returns.
      // The handler and modal dismissal manage the final loading state.
    }
  }

  if (loading) {
    return <p className="p-8">Loading payment details...</p>
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">Payment Checkout</h1>

        <p className="mt-2 text-sm text-green-700">
          Razorpay Test Mode – No real money will be charged.
        </p>

        {error && (
          <p className="mt-4 rounded bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        {notice && (
          <p className="mt-4 rounded bg-green-100 p-3 text-green-700">
            {notice}
          </p>
        )}

        {booking && (
          <div className="mt-6 rounded-lg border p-5">
            <h2 className="text-xl font-semibold">Booking Details</h2>

            <p className="mt-3">Event Date: {booking.event_date}</p>
            <p>Location: {booking.event_location}</p>

            <p className="mt-4 text-gray-600">Amount to Pay</p>

            <p className="text-3xl font-bold">
              ₹{Number(booking.quoted_amount).toLocaleString('en-IN')}
            </p>

            <button
              onClick={makePayment}
              disabled={paying || notice.includes('successful')}
              className="mt-6 w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {paying ? 'Opening payment...' : 'Pay with Razorpay'}
            </button>
          </div>
        )}

        <button
          onClick={() => router.push('/my-bookings')}
          className="mt-6 rounded bg-blue-600 px-5 py-2 text-white"
        >
          Back to My Bookings
        </button>
      </div>
    </main>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading payment page...</p>}>
      <PaymentContent />
    </Suspense>
  )
}
