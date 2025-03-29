'use client';

import { useState, useCallback } from 'react';
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/icons";
import { debounce } from 'lodash';

export interface PartyCode {
  id: string;
  code: string;
  customerName: string | null;
  city: string | null;
}

interface PartyCodeSelectorProps {
  value: string | null;
  onChange: (partyCode: PartyCode) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PartyCodeSelector({
  value,
  onChange,
  disabled = false,
  placeholder = "Select Party"
}: PartyCodeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [partyCodes, setPartyCodes] = useState<PartyCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  const searchPartyCode = useCallback(async (search: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/party/partycode?search=${search}`);
      const { data } = await response.json();
      setPartyCodes(data);
    } catch (error) {
      console.error('Failed to fetch party codes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearchPartyCode = useCallback(
    debounce((search: string) => {
      searchPartyCode(search);
    }, 600),
    [searchPartyCode]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearchPartyCode(value);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      searchPartyCode(searchTerm || '');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
          disabled={disabled}
        >
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ maxHeight: '300px', width: '300px' }}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Party Code"
            value={searchTerm}
            onValueChange={handleSearchChange}
          />

          {isLoading ? (
            <CommandEmpty className="m-auto flex items-center justify-center p-4 relative h-[100px]">
              <div className="flex items-center justify-center w-full">
                <Spinner />
              </div>
            </CommandEmpty>
          ) : (
            <CommandEmpty className="m-auto flex items-center justify-center p-4">
              No party found.
            </CommandEmpty>
          )}

          <div className="max-h-[200px] overflow-y-auto">
            <CommandGroup>
              {partyCodes.map((party) => (
                <CommandItem
                  key={party.id}
                  value={party.code}
                  onSelect={() => {
                    onChange(party);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === party.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {party.code} - {party?.customerName}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 