'use client';

import { Analytics } from '@vercel/analytics/react';
import AuthProvider from '@/components/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import moment from 'moment-timezone';
import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import SessionCheck from '../components/auth/session';

export default function ClientLayout({
  children
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    moment.tz.setDefault('Asia/Kolkata');
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen w-full flex-col max-w-[100vw]">
        <React.StrictMode>
          <Analytics /> 
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthProvider>
              <SessionCheck>
                {children}
              </SessionCheck>
              <Toaster />
              <SonnerToaster position="top-right" />
            </AuthProvider>
          </ThemeProvider>
        </React.StrictMode>
      </body>
    </html>
  );
} 