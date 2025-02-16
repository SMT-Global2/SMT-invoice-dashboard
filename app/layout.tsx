import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import AuthProvider from '@/components/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import moment from 'moment-timezone';

export const metadata = {
  title: 'Sanjivan Medico Traders',
  description: 'Sanjivan Medico Traders Dashboard',
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {

  moment.tz.setDefault('Asia/Kolkata');

  return (
    <html lang="en">
      <head>
      <link rel="smt" href="/static/favicon.png" />
      </head>
      <body className="flex min-h-screen w-full flex-col">
          <Analytics />
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
      </body>
    </html>
  );
}
