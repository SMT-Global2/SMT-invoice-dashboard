import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import AuthProvider from '@/components/auth-provider';
import { Toaster } from '@/components/ui/toaster';

export const metadata = {
  title: 'Sanjivan Medico Traders',
  description: 'Sanjivan Medico Traders Dashboard',
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
      <link rel="smt" href="/static/favicon.png" />
      </head>
      <body className="flex min-h-screen w-full flex-col">
        <AuthProvider>
          {children}
          <Toaster />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
