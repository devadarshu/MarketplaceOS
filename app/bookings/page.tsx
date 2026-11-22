
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = {
  id: string
  title: string
  vendor_id: string
  city: string
  price: number
}

export default function BookingsPage() {
  const router = useRouter()

  const [services, setServices] = useState<Service[]>([])
  const [serviceId, setServiceId] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadServices() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('services')
        .select('id, title, vendor_id, city, price')
        .eq('is_active', true)

      if (error) {
        setNotice(error.message)
      } else {
        setServices(data ?? [])
      }

      setLoading(false)
    }

    loadServices()
  }, [router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setNotice('')

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    const selectedService = services.find(
      service => service.id === serviceId
    )

    if (!selectedService) {
      setNotice('Please select a service.')
      setSubmitting(false)
      return
    }

    const { error } = await supabase
      .from('bookings')
      .insert({
        customer_id: user.id,
        vendor_id: selectedService.vendor_id,
        service_id: selectedService.id,
        event_date: eventDate,
        event_location: location.trim(),
        guest_count: guestCount ? Number(guestCount) : null,
        customer_message: message.trim() || null,
        status: 'requested',
      })

    setSubmitting(false)

    if (error) {
      setNotice(error.message)
      return
    }

    setNotice('Booking request submitted successfully!')
    setServiceId('')
    setEventDate('')
    setLocation('')
    setGuestCount('')
    setMessage('')
  }

  if (loading) {
    return <p className="p-8">Loading booking form...</p>
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-gray-900">
          Request a Booking
        </h1>

        <p className="mt-2 text-gray-600">
          Submit your event requirements to a service provider.
        </p>

        {services.length === 0 ? (
          <p className="mt-6 rounded-lg bg-yellow-50 p-4 text-yellow-800">
            No active services are available yet. Please try again after
            vendors publish their services.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block font-medium">
                Select Service
              </label>
              <select
                required
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className="w-full rounded-lg border p-3"
              >
                <option value="">Choose a service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.title} - {service.city} (₹{service.price})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Event Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Event Location
              </label>
              <input
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Enter event location"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Number of Guests
              </label>
              <input
                type="number"
                min="1"
                value={guestCount}
                onChange={e => setGuestCount(e.target.value)}
                placeholder="Enter guest count"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Additional Requirements
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe your requirements"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Booking Request'}
            </button>
          </form>
        )}

        {notice && (
          <p className="mt-4 rounded-lg bg-blue-50 p-3 text-blue-800">
            {notice}
          </p>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-5 text-blue-600 hover:underline"
        >
          Back to Dashboard
        </button>
      </div>
    </main>
  )
}
