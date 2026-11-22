
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">

      {/* Navigation */}
      <nav className="flex items-center justify-between bg-white px-6 py-5 shadow-sm md:px-16">
        <h1 className="text-2xl font-bold text-blue-700">
          MarketplaceOS
        </h1>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 font-medium text-blue-700 hover:bg-blue-50"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-24 text-center text-white md:py-32">
        <p className="mb-4 font-semibold tracking-widest text-blue-200">
          YOUR EVENT, OUR MARKETPLACE
        </p>

        <h2 className="mx-auto max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
          Plan Your Perfect Event with MarketplaceOS
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100">
          Discover trusted event service providers, compare services,
          request bookings and manage your events in one place.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/services"
            className="rounded-lg bg-white px-8 py-3 font-bold text-blue-700 hover:bg-blue-50"
          >
            Explore Services
          </Link>

          <Link
            href="/register"
            className="rounded-lg border border-white px-8 py-3 font-bold text-white hover:bg-white/10"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 md:px-16">
        <h2 className="text-center text-3xl font-bold">
          Everything You Need in One Marketplace
        </h2>

        <p className="mt-3 text-center text-gray-600">
          Simple tools for customers, vendors and administrators.
        </p>

        <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-3">

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="text-4xl">🎉</div>
            <h3 className="mt-5 text-xl font-bold">
              Discover Services
            </h3>
            <p className="mt-3 text-gray-600">
              Explore event planning, decoration, catering,
              photography and other services.
            </p>
          </div>

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="text-4xl">📅</div>
            <h3 className="mt-5 text-xl font-bold">
              Manage Bookings
            </h3>
            <p className="mt-3 text-gray-600">
              Submit booking requests, receive quotations
              and track your booking status.
            </p>
          </div>

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <div className="text-4xl">💳</div>
            <h3 className="mt-5 text-xl font-bold">
              Track Payments
            </h3>
            <p className="mt-3 text-gray-600">
              View payment records and monitor transaction
              status through your account.
            </p>
          </div>

        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-blue-50 px-6 py-16 text-center">
        <h2 className="text-3xl font-bold">
          Ready to Get Started?
        </h2>

        <p className="mt-4 text-gray-600">
          Join MarketplaceOS and make event management easier.
        </p>

        <Link
          href="/register"
          className="mt-7 inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Create Your Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-6 py-8 text-center text-gray-300">
        <h3 className="text-xl font-bold text-white">
          MarketplaceOS
        </h3>
        <p className="mt-2 text-sm">
          Connecting customers with trusted event service providers.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          © 2026 MarketplaceOS. All rights reserved.
        </p>
      </footer>

    </main>
  )
}
