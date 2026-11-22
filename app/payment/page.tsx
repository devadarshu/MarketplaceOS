
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Booking = {
  id: string
  event_date: string
  event_location: string
  status: string
  quoted_amount: number | null
}

export default function PaymentPage() {
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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      if (!bookingId) {
        setError('Booking ID is missing.')
        setLoading(false)
        return
      }

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)
      ) {
        setError('Invalid booking ID.')
        setLoading(false)
        return
      }

      

      const { data, error } = await supabase
        .from('bookings')
        .select('id, event_date, event_location, status, quoted_amount')
        .eq('id', bookingId)
        .eq('customer_id', user.id)
        .single()

      if (error) {
        setError(error.message)
      } else if (data.status !== 'confirmed' || !data.quoted_amount) {
        setError('Only confirmed bookings with a valid quotation can be paid.')
      } else {
        setBooking(data)
      }

      setLoading(false)
    }

    loadBooking()
  }, [bookingId, router])

  async function makePayment() {
    if (!booking || paying || notice) return

    setPaying(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Payment failed.')
        return
      }

      setNotice(
        `Simulated payment successful! Amount: ₹${result.amount}. Reference: ${result.reference}`
      )
    } catch {
      setError('Unable to connect to the payment server.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return <p className="p-8">Loading payment details...</p>
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">Payment Checkout</h1>

        <p className="mt-2 text-sm text-orange-700">
          DEMO MODE – No real money will be charged.
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

            <h2 className="text-xl font-semibold">
              Booking Details
            </h2>

            <p className="mt-3">
              Event Date: {booking.event_date}
            </p>

            <p>Location: {booking.event_location}</p>

            <p className="mt-4 text-gray-600">
              Amount to Pay
            </p>

            <p className="text-3xl font-bold">
              ₹{booking.quoted_amount}
            </p>

            <button
              onClick={makePayment}
              disabled={paying || notice !== ''}
              className="mt-6 w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {paying ? 'Processing...' : 'Simulate Successful Payment'}
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
