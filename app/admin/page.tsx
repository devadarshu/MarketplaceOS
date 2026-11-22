
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Vendor = {
  id: string
  business_name: string
  description: string | null
  city: string | null
  status: string
}

type Booking = {
  id: string
  event_date: string
  event_location: string
  guest_count: number | null
  status: string
  quoted_amount: number | null
}

type Transaction = {
  id: string
  booking_id: string
  amount: number
  payment_type: string
  payment_status: string
  payment_reference: string | null
}

export default function AdminPage() {
  const router = useRouter()

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  async function loadAdminData() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      router.replace('/dashboard')
      return
    }

    const [vendorResult, bookingResult, transactionResult] =
      await Promise.all([
        supabase
          .from('vendors')
          .select('id, business_name, description, city, status')
          .order('created_at', { ascending: false }),

        supabase
          .from('bookings')
          .select('id, event_date, event_location, guest_count, status, quoted_amount')
          .order('created_at', { ascending: false }),

        supabase
          .from('transactions')
          .select('id, booking_id, amount, payment_type, payment_status, payment_reference')
          .order('created_at', { ascending: false }),
      ])

    if (vendorResult.error) {
      setNotice('Vendor loading error: ' + vendorResult.error.message)
    } else {
      setVendors(vendorResult.data ?? [])
    }

    if (bookingResult.error) {
      setNotice('Booking loading error: ' + bookingResult.error.message)
    } else {
      setBookings(bookingResult.data ?? [])
    }

    if (transactionResult.error) {
      setNotice('Payment loading error: ' + transactionResult.error.message)
    } else {
      setTransactions(transactionResult.data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  async function approveVendor(vendorId: string) {
    const supabase = createClient()

    const { error } = await supabase
      .from('vendors')
      .update({ status: 'approved' })
      .eq('id', vendorId)

    if (error) {
      setNotice(error.message)
    } else {
      setNotice('Vendor approved successfully!')
      await loadAdminData()
    }
  }

  if (loading) {
    return <p className="p-8">Loading admin dashboard...</p>
  }

  const approvedVendors = vendors.filter(
    vendor => vendor.status === 'approved'
  ).length

  const pendingVendors = vendors.filter(
    vendor => vendor.status === 'pending'
  ).length

  const paidTransactions = transactions.filter(
    transaction => transaction.payment_status === 'paid'
  )

  const totalPayments = paidTransactions.reduce(
    (total, transaction) => total + Number(transaction.amount),
    0
  )

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl rounded-xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <p className="mt-2 text-gray-600">
          Monitor vendors, customer bookings and platform payments.
        </p>

        {notice && (
          <p className="mt-4 rounded bg-blue-100 p-3 text-blue-800">
            {notice}
          </p>
        )}

        {/* DASHBOARD STATISTICS */}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-lg bg-blue-50 p-5">
            <p className="text-gray-600">Total Vendors</p>
            <p className="mt-2 text-3xl font-bold">{vendors.length}</p>
          </div>

          <div className="rounded-lg bg-green-50 p-5">
            <p className="text-gray-600">Approved Vendors</p>
            <p className="mt-2 text-3xl font-bold">{approvedVendors}</p>
          </div>

          <div className="rounded-lg bg-orange-50 p-5">
            <p className="text-gray-600">Pending Vendors</p>
            <p className="mt-2 text-3xl font-bold">{pendingVendors}</p>
          </div>

          <div className="rounded-lg bg-purple-50 p-5">
            <p className="text-gray-600">Total Bookings</p>
            <p className="mt-2 text-3xl font-bold">{bookings.length}</p>
          </div>

        </div>

        {/* VENDOR APPLICATIONS */}

        <h2 className="mt-10 text-2xl font-semibold">
          Vendor Applications
        </h2>

        {vendors.length === 0 ? (
          <p className="mt-4 text-gray-600">
            No vendor applications found.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {vendors.map(vendor => (
              <div key={vendor.id} className="rounded-lg border p-5">

                <h3 className="text-lg font-bold">
                  {vendor.business_name}
                </h3>

                <p className="mt-1 text-gray-600">
                  {vendor.description}
                </p>

                <p className="mt-1">City: {vendor.city}</p>

                <p className="mt-1">
                  Status: <strong>{vendor.status}</strong>
                </p>

                {vendor.status === 'pending' && (
                  <button
                    onClick={() => approveVendor(vendor.id)}
                    className="mt-4 rounded-lg bg-green-600 px-5 py-2 text-white"
                  >
                    Approve Vendor
                  </button>
                )}

              </div>
            ))}
          </div>
        )}

        {/* CUSTOMER BOOKINGS */}

        <h2 className="mt-10 text-2xl font-semibold">
          All Customer Bookings
        </h2>

        {bookings.length === 0 ? (
          <p className="mt-4 text-gray-600">No bookings found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="rounded-lg border p-5">

                <p className="break-all">
                  <strong>Booking ID:</strong> {booking.id}
                </p>

                <p className="mt-2">
                  Event Date: {booking.event_date}
                </p>

                <p>Location: {booking.event_location}</p>

                <p>
                  Guests: {booking.guest_count ?? 'Not specified'}
                </p>

                <p>
                  Booking Status: <strong>{booking.status}</strong>
                </p>

                <p>
                  Quoted Amount: {booking.quoted_amount === null
                    ? 'Awaiting quote'
                    : `₹${booking.quoted_amount}`}
                </p>

              </div>
            ))}
          </div>
        )}

        {/* PAYMENT MONITORING */}

        <h2 className="mt-10 text-2xl font-semibold">
          Payment Transactions
        </h2>

        <div className="mt-4 rounded-lg bg-purple-50 p-5">
          <p className="text-gray-600">Total Successfully Recorded Payments</p>
          <p className="mt-2 text-3xl font-bold">
            ₹{totalPayments.toLocaleString('en-IN')}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {paidTransactions.length} successful payment record(s)
          </p>
        </div>

        {transactions.length === 0 ? (
          <p className="mt-4 text-gray-600">
            No payment transactions found.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {transactions.map(transaction => (
              <div key={transaction.id} className="rounded-lg border p-5">

                <p className="break-all">
                  <strong>Transaction ID:</strong> {transaction.id}
                </p>

                <p className="mt-2 break-all">
                  Booking ID: {transaction.booking_id}
                </p>

                <p>Amount: ₹{transaction.amount}</p>

                <p>Payment Type: {transaction.payment_type}</p>

                <p>
                  Payment Status:{' '}
                  <strong>{transaction.payment_status}</strong>
                </p>

                <p className="break-all">
                  Payment Reference: {transaction.payment_reference || 'Not available'}
                </p>

              </div>
            ))}
          </div>
        )}

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
