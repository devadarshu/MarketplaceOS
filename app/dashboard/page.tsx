
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient()

      const { data: { user }, error: authError } =
        await supabase.auth.getUser()

      if (authError || !user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? '')

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) {
        console.log('Profile error:', error.message)
        setRole('Error: ' + error.message)
      } else {
        setRole(profile.role)
      }

      setLoading(false)
    }

    checkUser()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  if (loading) return <p className="p-8">Loading dashboard...</p>

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold text-gray-900">
          MarketplaceOS Dashboard
        </h1>

        <p className="mt-4 text-gray-700">
          Welcome, {email}!
        </p>

        <p className="mt-2 text-gray-700">
          Account Role: <strong>{role}</strong>
        </p>

        {role === 'customer' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold">Customer Dashboard</h2>

            <p className="mt-2 text-gray-600">
              Browse services and manage your bookings.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/services')}
                className="rounded-lg bg-blue-600 px-5 py-3 text-white"
              >
                Browse Services
              </button>

              <button
                onClick={() => router.push('/bookings')}
                className="rounded-lg bg-green-600 px-5 py-3 text-white"
              >
                Request a Booking
              </button>

              <button
                onClick={() => router.push('/my-bookings')}
                className="rounded-lg bg-purple-600 px-5 py-3 text-white"
              >
                My Bookings
              </button>
            </div>
          </div>
        )}

        {role === 'vendor' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold">Vendor Dashboard</h2>

            <p className="mt-2 text-gray-600">
              Manage your business, services and customer bookings.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/vendor')}
                className="rounded-lg bg-blue-600 px-5 py-3 text-white"
              >
                Vendor Onboarding
              </button>

              <button
                onClick={() => router.push('/vendor-services')}
                className="rounded-lg bg-green-600 px-5 py-3 text-white"
              >
                Manage Services
              </button>

              <button
                onClick={() => router.push('/vendor-bookings')}
                className="rounded-lg bg-purple-600 px-5 py-3 text-white"
              >
                Vendor Bookings
              </button>
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold">Admin Dashboard</h2>

            <p className="mt-2 text-gray-600">
              Manage vendors and marketplace activities.
            </p>

            <button
              onClick={() => router.push('/admin')}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-white"
            >
              Admin Panel
            </button>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="mt-8 rounded bg-gray-700 px-5 py-3 text-white"
        >
          Logout
        </button>

      </div>
    </main>
  )
}
