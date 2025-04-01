'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Check, X, Filter, Search, Earth } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Command, CommandGroup, CommandItem, CommandList, CommandInput, CommandEmpty } from './ui/command';
import { cn } from '@/lib/utils';

interface RegionalCodeFilterProps {
  selectedRegionalCodes: string[];
  availableRegionalCodes: string[];
  setSelectedRegionalCodes: (codes: string[]) => void;
  label?: string;
}

export function RegionalCodeFilter({
  selectedRegionalCodes,
  availableRegionalCodes,
  setSelectedRegionalCodes,
  label = 'Regional Codes'
}: RegionalCodeFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleRegionalCode = (code: string) => {
    if (selectedRegionalCodes.includes(code)) {
      setSelectedRegionalCodes(selectedRegionalCodes.filter(c => c !== code));
    } else {
      setSelectedRegionalCodes([...selectedRegionalCodes, code]);
    }
  };

  const clearAllSelectedCodes = () => {
    setSelectedRegionalCodes([]);
    setOpen(false);
  };

  // Filter the available codes based on search query
  const filteredCodes = searchQuery 
    ? availableRegionalCodes.filter(code => 
        code.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableRegionalCodes;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 flex items-center gap-1 min-w-[100px] w-full justify-center"
        >
          <Earth className="h-3.5 w-3.5" />
          <span>{label}</span>
          {selectedRegionalCodes.length > 0 && (
            <Badge 
              variant="secondary" 
              className="rounded-full ml-1 px-1 font-normal text-xs"
            >
              {selectedRegionalCodes.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start" side="bottom">
        <div className="p-2 flex items-center justify-between">
          <Label className="font-medium">Filter by region</Label>
          {selectedRegionalCodes.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={clearAllSelectedCodes}
            >
              Clear all
              <X className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
        <Separator />
        <Command>
          <CommandInput 
            placeholder="Search regions..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-none focus:ring-0"
          />
          <CommandList className="max-h-[280px] overflow-auto">
            <CommandEmpty>No matching regions found.</CommandEmpty>
            <CommandGroup>
              {filteredCodes.map(code => (
                <CommandItem
                  key={code}
                  onSelect={() => toggleRegionalCode(code)}
                  className="flex items-center cursor-pointer"
                >
                  <div 
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      selectedRegionalCodes.includes(code) 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-muted-foreground"
                    )}
                  >
                    {selectedRegionalCodes.includes(code) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <span>{code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {selectedRegionalCodes.length > 0 && (
          <div className="border-t p-2">
            <div className="flex flex-wrap gap-1 items-center">
              <Label className="text-xs text-muted-foreground mr-2">Selected:</Label>
              {selectedRegionalCodes.map(code => (
                <Badge key={code} variant="secondary" className="flex items-center gap-1">
                  {code}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => toggleRegionalCode(code)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 