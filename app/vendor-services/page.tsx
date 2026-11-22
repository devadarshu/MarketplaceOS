
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = {
  id: string
  title: string
  description: string
  category: string
  city: string
  price: number
  is_active: boolean
}

export default function VendorServicesPage() {
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [price, setPrice] = useState('')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadServices(vendorId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('services')
      .select('id, title, description, category, city, price, is_active')
      .eq('vendor_id', vendorId)
      .order('title')

    if (error) {
      setMessage(error.message)
    } else {
      setServices((data ?? []) as Service[])
    }

    setServicesLoading(false)
  }

  useEffect(() => {
    async function checkVendor() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'vendor') {
        setMessage('Only vendor accounts can access this page.')
        setChecking(false)
        setServicesLoading(false)
        return
      }

      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error || !vendor) {
        setMessage(error?.message || 'Please complete your vendor onboarding first.')
        setChecking(false)
        setServicesLoading(false)
        return
      }

      if (vendor.status !== 'approved') {
        setMessage('Your vendor account is awaiting admin approval.')
        setChecking(false)
        setServicesLoading(false)
        return
      }

      setAuthorized(true)
      setChecking(false)

      await loadServices(vendor.id)
    }

    checkVendor()
  }, [router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      router.replace('/login')
      return
    }

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, status')
      .eq('user_id', user.id)
      .single()

    if (vendorError || !vendor || vendor.status !== 'approved') {
      setLoading(false)
      setMessage('Your approved vendor account could not be verified.')
      return
    }

    const { error } = await supabase
      .from('services')
      .insert({
        vendor_id: vendor.id,
        title: title.trim(),
        description: description.trim(),
        category,
        city: city.trim(),
        price: Number(price),
        is_active: true,
      })

    if (error) {
      setLoading(false)
      setMessage(error.message)
      return
    }

    setTitle('')
    setDescription('')
    setCategory('')
    setCity('')
    setPrice('')

    await loadServices(vendor.id)

    setLoading(false)
    setMessage('Service added successfully!')
  }

  if (checking) {
    return <p className="p-8">Checking vendor permissions...</p>
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold">Vendor Services</h1>
          <p className="mt-4 text-gray-700">{message}</p>
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

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-8">

        <section className="rounded-xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold">My Existing Services</h1>

          {servicesLoading ? (
            <p className="mt-4 text-gray-600">Loading services...</p>
          ) : services.length === 0 ? (
            <p className="mt-4 text-gray-600">
              You haven't published any services yet.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-lg border p-4"
                >
                  <h2 className="text-lg font-semibold">
                    {service.title}
                  </h2>

                  <p className="mt-2 text-gray-600">
                    {service.description}
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    Category: {service.category}
                  </p>

                  <p className="text-sm text-gray-600">
                    City: {service.city}
                  </p>

                  <p className="mt-1 font-semibold">
                    Price: ₹{Number(service.price).toLocaleString('en-IN')}
                  </p>

                  <p className="mt-2 text-sm">
                    Status: {service.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">Add a Service</h1>

          <p className="mt-2 text-gray-600">
            Publish a service for customers to discover.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Service title"
              className="w-full rounded-lg border p-3"
            />

            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Service description"
              className="w-full rounded-lg border p-3"
            />

            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select category</option>
              <option value="Catering">Catering</option>
              <option value="Decoration">Decoration</option>
              <option value="Photography">Photography</option>
              <option value="Venue">Venue</option>
              <option value="Music">Music and Entertainment</option>
              <option value="Other">Other</option>
            </select>

            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full rounded-lg border p-3"
            />

            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price (₹)"
              className="w-full rounded-lg border p-3"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Adding Service...' : 'Add Service'}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-lg bg-blue-50 p-3 text-blue-800">
              {message}
            </p>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="mt-5 text-blue-600 hover:underline"
          >
            Back to Dashboard
          </button>
        </section>
      </div>
    </main>
  )
}
