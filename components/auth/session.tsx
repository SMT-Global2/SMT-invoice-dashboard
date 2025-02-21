'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SessionCheck({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check if session exists but user data is empty (which happens when user was deleted)
    if (session && (!session.user?.id || !session.user?.username)) {
      router.push('/login');
    }
  }, [session, router]);

  return <>{children}</>;
} 