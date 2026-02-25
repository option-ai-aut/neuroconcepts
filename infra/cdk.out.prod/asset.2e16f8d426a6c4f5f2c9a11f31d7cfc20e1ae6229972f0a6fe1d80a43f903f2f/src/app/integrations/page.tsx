'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IntegrationenRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/#features');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Weiterleitung...</p>
    </div>
  );
}
