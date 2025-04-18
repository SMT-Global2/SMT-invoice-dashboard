import './globals.css';
import SessionProviderWrapper from '@/components/providers/session-provider';
import ThemeProviderWrapper from '@/components/providers/theme-provider';
import { Toaster } from 'sonner';

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProviderWrapper>
          <SessionProviderWrapper>
            {children}
            <Toaster />
          </SessionProviderWrapper>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
