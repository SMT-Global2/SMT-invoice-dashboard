'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/icons';
import { Search } from 'lucide-react';

export function SearchInput() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function searchAction(formData: FormData) {
    let value = formData.get('q') as string;
    let params = new URLSearchParams({ q: value });
    startTransition(() => {
      router.replace(`/?${params.toString()}`);
    });
  }

  return (
    <form action={searchAction} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
        <Input
          name="q"
          type="search"
          placeholder="Search..."
          className="pl-9 pr-3 py-1 h-8 text-sm rounded-full border border-border bg-background/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 w-full"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none">
            <Spinner />
          </div>
        )}
      </div>
    </form>
  );
}
