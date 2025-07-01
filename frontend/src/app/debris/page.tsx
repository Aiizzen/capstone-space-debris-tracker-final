'use client'

import dynamic from 'next/dynamic'

const DebrisMap = dynamic(() => import('@/components/DebrisMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
})

export default function DebrisPage() {
  return (
    <main className="min-h-screen bg-black">
      <DebrisMap />
    </main>
  )
}
