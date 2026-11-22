
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Booking = {
  id: string
  event_date: string
  event_location: string
  guest_count: number | null
  customer_message: string | null
  status: string
  quoted_amount: number | null
}

type Transaction = {
  booking_id: string
  amount: number
  payment_status: string
  payment_reference: string | null
}

export default function VendorBookingsPage() {
  const router = useRouter()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [vendorId, setVendorId] = useState('')
  const [quoteAmounts, setQuoteAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    async function loadBookings() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, status')
        .eq('user_id', user.id)
        .single()

      if (vendorError || !vendor) {
        setNotice('Vendor account not found.')
        setLoading(false)
        return
      }

      if (vendor.status !== 'approved') {
        setNotice('Your vendor account is awaiting approval.')
        setLoading(false)
        return
      }

      setVendorId(vendor.id)

      const { data, error } = await supabase
        .from('bookings')
        .select('id, event_date, event_location, guest_count, customer_message, status, quoted_amount')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })

      if (error) {
        setNotice(error.message)
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
          setNotice('Could not load payment details: ' + paymentError.message)
        } else {
          setTransactions(paymentData ?? [])
        }
      }

      setLoading(false)
    }

    loadBookings()
  }, [router])

  async function sendQuote(bookingId: string) {
    const amount = Number(quoteAmounts[bookingId])

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('Please enter a valid quotation amount.')
      return
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('bookings')
      .update({
        quoted_amount: amount,
        status: 'quoted',
      })
      .eq('id', bookingId)
      .eq('vendor_id', vendorId)
      .eq('status', 'requested')
      .select('id, status, quoted_amount')
      .maybeSingle()

    if (error) {
      setNotice('Quotation failed: ' + error.message)
      return
    }

    if (!data) {
      setNotice(
        'No booking was updated. Please check vendor approval and permissions.'
      )
      return
    }

    setBookings(current =>
      current.map(booking =>
        booking.id === bookingId
          ? {
              ...booking,
              quoted_amount: data.quoted_amount,
              status: data.status,
            }
          : booking
      )
    )

    setNotice('Quotation saved successfully!')
  }

  if (loading) {
    return <p className="p-8">Loading vendor bookings...</p>
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          Vendor Booking Management
        </h1>

        <p className="mt-2 text-gray-600">
          View customer booking requests, send quotations and track payments.
        </p>

        {notice && (
          <p className="mt-4 rounded bg-blue-100 p-3 text-blue-800">
            {notice}
          </p>
        )}

        {bookings.length === 0 && !notice && (
          <p className="mt-6 rounded bg-gray-100 p-5 text-gray-600">
            No booking requests received yet.
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

                <h2 className="text-lg font-bold">
                  Booking Request
                </h2>

                <p className="mt-2">
                  Booking ID: {booking.id}
                </p>

                <p>Event Date: {booking.event_date}</p>

                <p>Location: {booking.event_location}</p>

                <p>
                  Guests: {booking.guest_count ?? 'Not specified'}
                </p>

                <p>
                  Customer Message: {booking.customer_message || 'No message'}
                </p>

                <p>
                  Booking Status: <strong>{booking.status}</strong>
                </p>

                <p>
                  Quoted Amount: {booking.quoted_amount === null
                    ? 'Awaiting vendor quote'
                    : `₹${booking.quoted_amount}`}
                </p>

                {booking.status === 'requested' && (
                  <div className="mt-4">

                    <label className="mb-2 block font-medium">
                      Enter Quotation Amount (₹)
                    </label>

                    <input
                      type="number"
                      min="1"
                      placeholder="Example: 45000"
                      value={quoteAmounts[booking.id] ?? ''}
                      onChange={e =>
                        setQuoteAmounts(current => ({
                          ...current,
                          [booking.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border p-3"
                    />

                    <button
                      onClick={() => sendQuote(booking.id)}
                      className="mt-3 rounded-lg bg-green-600 px-5 py-2 text-white"
                    >
                      Send Quote
                    </button>

                  </div>
                )}

                <div className="mt-5 rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold">
                    Customer Payment Details
                  </h3>

                  {payment ? (
                    <>
                      <p className="mt-2 font-semibold text-green-700">
                        Payment Status: PAID
                      </p>

                      <p>Amount Received: ₹{payment.amount}</p>

                      <p className="break-all">
                        Payment Reference: {payment.payment_reference || 'Not available'}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 font-medium text-orange-700">
                      Payment Status: UNPAID
                    </p>
                  )}
                </div>

              </div>
            )
          })}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-8 rounded bg-blue-600 px-5 py-2 text-white"
        >
          Back to Dashboard
        </button>

      </div>
    </main>
  )
}
