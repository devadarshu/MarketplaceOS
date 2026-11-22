
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Booking = {
  id: string
  event_date: string
  event_location: string
  guest_count: number | null
  status: string
  quoted_amount: number | null
}

type Transaction = {
  booking_id: string
  amount: number
  payment_status: string
  payment_reference: string | null
}

export default function MyBookingsPage() {
  const router = useRouter()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [acceptingId, setAcceptingId] = useState('')

  async function loadBookings() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('id, event_date, event_location, guest_count, status, quoted_amount')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const bookingData = data ?? []
    setBookings(bookingData)

    if (bookingData.length > 0) {
      const bookingIds = bookingData.map(booking => booking.id)

      const { data: paymentData, error: paymentError } = await supabase
        .from('transactions')
        .select('booking_id, amount, payment_status, payment_reference')
        .in('booking_id', bookingIds)

      if (paymentError) {
        setError('Could not load payment details: ' + paymentError.message)
      } else {
        setTransactions(paymentData ?? [])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadBookings()
  }, [router])

  async function acceptQuote(bookingId: string) {
    setError('')
    setNotice('')
    setAcceptingId(bookingId)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAcceptingId('')
      router.replace('/login')
      return
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .eq('customer_id', user.id)
      .eq('status', 'quoted')
      .select('id, status')
      .maybeSingle()

    setAcceptingId('')

    if (error) {
      setError(error.message)
      return
    }

    if (!data) {
      setError('Booking was not updated. Please check its status and permissions.')
      return
    }

    setBookings(current =>
      current.map(booking =>
        booking.id === bookingId
          ? { ...booking, status: data.status }
          : booking
      )
    )

    setNotice('Quotation accepted! Your booking is confirmed.')
  }

  if (loading) {
    return <p className="p-8">Loading your bookings...</p>
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">My Bookings</h1>

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

        {bookings.length === 0 && !error && (
          <p className="mt-6 rounded bg-gray-100 p-5 text-gray-600">
            You haven&apos;t submitted any booking requests yet.
          </p>
        )}

        <div className="mt-6 space-y-4">
          {bookings.map(booking => {
            const payment = transactions.find(
              transaction =>
                transaction.booking_id === booking.id &&
                transaction.payment_status === 'paid'
            )

            return (
              <div key={booking.id} className="rounded-lg border p-5">

                <p><strong>Booking ID:</strong> {booking.id}</p>
                <p><strong>Event Date:</strong> {booking.event_date}</p>
                <p><strong>Location:</strong> {booking.event_location}</p>
                <p><strong>Guests:</strong> {booking.guest_count ?? 'Not specified'}</p>
                <p><strong>Booking Status:</strong> {booking.status}</p>

                <p>
                  <strong>Quoted Amount:</strong>{' '}
                  {booking.quoted_amount === null
                    ? 'Awaiting vendor quote'
                    : `₹${booking.quoted_amount}`}
                </p>

                {booking.status === 'quoted' && (
                  <button
                    onClick={() => acceptQuote(booking.id)}
                    disabled={acceptingId === booking.id}
                    className="mt-4 rounded-lg bg-green-600 px-5 py-2 text-white disabled:opacity-50"
                  >
                    {acceptingId === booking.id
                      ? 'Accepting...'
                      : 'Accept Quotation'}
                  </button>
                )}

                {booking.status === 'confirmed' && (
                  <p className="mt-4 font-semibold text-green-700">
                    Booking Confirmed!
                  </p>
                )}

                <div className="mt-5 rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold">Payment Details</h3>

                  {payment ? (
                    <>
                      <p className="mt-2 text-green-700 font-semibold">
                        Payment Status: PAID
                      </p>

                      <p>
                        Amount Paid: ₹{payment.amount}
                      </p>

                      <p className="break-all">
                        Payment Reference: {payment.payment_reference || 'Not available'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-orange-700 font-medium">
                        Payment Status: UNPAID
                      </p>

                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() =>
                            router.push(
                              `/payment?bookingId=${booking.id}`
                            )
                          }
                          className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-white"
                        >
                          Pay Now
                        </button>
                      )}

                      {booking.status !== 'confirmed' && (
                        <p className="mt-2 text-sm text-gray-500">
                          Payment is available after quotation acceptance.
                        </p>
                      )}
                    </>
                  )}
                </div>

              </div>
            )
          })}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 rounded bg-blue-600 px-5 py-2 text-white"
        >
          Back to Dashboard
        </button>

      </div>
    </main>
  )
}
