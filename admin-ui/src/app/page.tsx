import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          MySQL Production Optimizer
        </h1>
        <p className="text-gray-600 mb-8">
          Admin Panel for managing MySQL optimizations
        </p>
        <Link 
          href="/admin" 
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Admin Panel
        </Link>
      </div>
    </div>
  )
}
