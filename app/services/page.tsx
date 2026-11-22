
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = {
  id: string
  title: string
  description: string | null
  category: string 
  city: string
  price: number 
  vendor_id: string
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

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
        .select('*')
        .eq('is_active', true)

      if (error) {
        setMessage(error.message)
      } else {
        setServices(data ?? [])
      }

      setLoading(false)
    }

    loadServices()
  }, [router])

  if (loading) {
    return <p className="p-8">Loading services...</p>
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Browse Services
        </h1>

        <p className="mt-2 text-gray-600">
          Discover services available on MarketplaceOS.
        </p>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 rounded bg-gray-700 px-4 py-2 text-white"
        >
          Back to Dashboard
        </button>

        {message && (
          <p className="mt-6 rounded bg-red-100 p-4 text-red-700">
            {message}
          </p>
        )}

        {!message && services.length === 0 && (
          <div className="mt-8 rounded-xl bg-white p-8 shadow">
            <p className="text-gray-700">
              No active services are available yet.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Approved vendors can add services here.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-xl bg-white p-6 shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900">
                {service.title}
              </h2>

              <p className="mt-2 text-gray-600">
                {service.description}
              </p>

              <p className="mt-3 text-sm text-gray-500">
                Category: {service.category || 'Not specified'}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                City: {service.city}
              </p>

              <p className="mt-2 font-semibold text-blue-700">
                Price: {service.price ?? 'Contact vendor'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
