'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, X, ArrowRight } from 'lucide-react';
import { 
  searchItems, 
  DashboardItem 
} from '@/lib/constants/dashboardData';
import { RoleGuard } from '@/components/auth/role-guard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function SearchInput() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DashboardItem[]>([]);
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Handle clickaway to close results and remove focus state
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current && 
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsResultsVisible(false);
        setIsFocused(false);
        // Blur the input when clicking outside
        if (document.activeElement === inputRef.current) {
          inputRef.current?.blur();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim().length > 0) {
      const results = searchItems(value);
      setSearchResults(results);
      setIsResultsVisible(results.length > 0);
    } else {
      setSearchResults([]);
      setIsResultsVisible(false);
    }
  }

  function handleFocus() {
    setIsFocused(true);
    if (searchQuery.trim().length > 0 && searchResults.length > 0) {
      setIsResultsVisible(true);
    }
  }

  function handleBlur() {
    // We'll handle this via the click outside handler
  }

  function handleNavigate(href: string) {
    startTransition(() => {
      router.push(href);
      setIsResultsVisible(false);
      setSearchQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
    });
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchResults([]);
    setIsResultsVisible(false);
    inputRef.current?.focus();
  }

  // Group search results by category
  const groupedResults = searchResults.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, DashboardItem[]>);

  return (
    <div className="relative w-full max-w-xl mx-auto" ref={searchContainerRef}>
      <motion.div 
        className={cn(
          "relative transition-all duration-200",
          isFocused ? "scale-105" : "scale-100"
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative flex items-center">
          {/* Absolute positioned search icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search dashboard..."
            className={cn(
              "pl-10 pr-12 py-2 h-10 text-sm rounded-full border transition-all duration-300",
              "bg-background/80 backdrop-blur-sm",
              "placeholder:text-muted-foreground/70 w-full shadow-sm",
              isFocused 
                ? "ring-2 ring-primary/20 ring-offset-0" 
                : "border-input focus-visible:ring-offset-0 focus-visible:ring-0"
            )}
            value={searchQuery}
            onChange={handleSearch}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-6">
            <AnimatePresence>
              {searchQuery && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center justify-center"
                >
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 p-0 rounded-full hover:bg-muted flex items-center justify-center"
                    onClick={clearSearch}
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {isPending && (
              <div className="flex items-center justify-center h-6 w-6 pointer-events-none">
                <svg
                  className="animate-spin h-4 w-4 text-muted-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isResultsVisible && searchResults.length > 0 && (
            <motion.div 
              ref={resultsRef}
              className="absolute z-50 w-full max-h-[80vh] mt-2 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg outline-none"
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="divide-y p-1 overflow-auto max-h-[80vh]">
                {Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category} className="py-2">
                    <h3 className="px-2 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </h3>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const ItemIcon = item.icon;
                        const resultItem = (
                          <motion.div
                            key={item.id}
                            className="relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer group"
                            whileHover={{ 
                              backgroundColor: 'var(--accent)',
                              transition: { duration: 0.2 } 
                            }}
                            onClick={() => handleNavigate(item.href)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center min-h-8 min-w-8 rounded-full bg-primary/10 text-primary">
                                <ItemIcon className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{item.title}</span>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {item.description}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </motion.div>
                        );

                        if (item.roles) {
                          return <RoleGuard key={item.id} allowedRoles={item.roles}>{resultItem}</RoleGuard>;
                        }
                        
                        return resultItem;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {searchResults.length > 0 && (
                <div className="bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <p>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
