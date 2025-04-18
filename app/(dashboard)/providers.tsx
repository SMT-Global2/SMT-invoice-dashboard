'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { SessionProvider, useSession } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';

export default function Providers({ children }: { children: React.ReactNode }) {

  // const session = useSession();

  // //white auth is loading show loadign screen
  // if (session.status === "loading") {
  //   return (
  //     <div className="flex h-screen w-screen items-center justify-center bg-background">
  //       <div className="flex flex-col items-center gap-4">
  //         <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //         <p className="text-sm text-muted-foreground">Loading...</p>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <TooltipProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {/* <SessionProvider> */}
          {children}
        {/* </SessionProvider> */}
      </ThemeProvider>
    </TooltipProvider>
  );
}