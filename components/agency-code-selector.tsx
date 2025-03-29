'use client';

import { useState, useCallback } from 'react';
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/icons";
import { debounce } from 'lodash';

export interface AgencyCode {
  id: string;
  code: string;
  companyName: string | null;
  shortName: string | null;
}

interface AgencyCodeSelectorProps {
  value: string | null;
  onChange: (agencyCode: AgencyCode) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AgencyCodeSelector({
  value,
  onChange,
  disabled = false,
  placeholder = "Select Agency"
}: AgencyCodeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [agencyCodes, setAgencyCodes] = useState<AgencyCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  const searchAgencyCode = useCallback(async (search: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/agency/agencycode?search=${search}`);
      const { data } = await response.json();
      setAgencyCodes(data);
    } catch (error) {
      console.error('Failed to fetch agency codes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearchAgencyCode = useCallback(
    debounce((search: string) => {
      searchAgencyCode(search);
    }, 600),
    [searchAgencyCode]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearchAgencyCode(value);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      searchAgencyCode(searchTerm || '');
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
            placeholder="Agency Code"
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
              No agency found.
            </CommandEmpty>
          )}

          <div className="max-h-[200px] overflow-y-auto">
            <CommandGroup>
              {agencyCodes.map((agency) => (
                <CommandItem
                  key={agency.id}
                  value={agency.code}
                  onSelect={() => {
                    onChange(agency);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === agency.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {agency.code} - {agency?.companyName || agency?.shortName}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 