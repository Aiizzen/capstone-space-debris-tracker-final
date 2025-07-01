'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/globe'); // or '/debris'
  }, [router]);

  return <p className="text-white text-center mt-10">Redirecting...</p>;
}
