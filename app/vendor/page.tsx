
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VendorPage() {
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [gstNumber, setGstNumber] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function checkVendorRole() {
      const supabase = createClient()

      const { data: { user }, error: authError } =
        await supabase.auth.getUser()

      if (authError || !user) {
        router.replace('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || profile?.role !== 'vendor') {
        router.replace('/dashboard')
        return
      }

      const { data: existingVendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (vendorError) {
        setMessage(vendorError.message)
        setChecking(false)
        return
      }

      if (existingVendor) {
        setMessage(
          `Your vendor application status is: ${existingVendor.status}`
        )
        setChecking(false)
        return
      }

      setAuthorized(true)
      setChecking(false)
    }

    checkVendorRole()
  }, [router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    const { error } = await supabase
      .from('vendors')
      .insert({
        user_id: user.id,
        business_name: businessName.trim(),
        description: description.trim(),
        city: city.trim(),
        gst_number: gstNumber.trim() || null,
        status: 'pending',
      })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setAuthorized(false)
    setMessage('Your vendor application was submitted and is awaiting admin approval.')
  }

  if (checking) {
    return <p className="p-8">Checking your account permissions...</p>
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-gray-900">
            Vendor Onboarding
          </h1>
          <p className="mt-4 text-gray-700">{message || 'You do not have access to this page.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-white"
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Vendor Onboarding
        </h1>

        <p className="mb-6 text-gray-600">
          Register your business on MarketplaceOS.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Business Name
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter your business name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Business Description
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your business and services"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bengaluru"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              placeholder="Enter GST number if available"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Vendor Application'}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            {message}
          </p>
        )}
      </div>
    </main>
  )
}
