'use client';

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RegionalCodeFilterProps {
  selectedRegionalCodes: string[];
  availableRegionalCodes: string[];
  setSelectedRegionalCodes: (values: string[]) => void;
  label?: string;
}

export function RegionalCodeFilter({
  selectedRegionalCodes,
  availableRegionalCodes,
  setSelectedRegionalCodes,
  label = "Select regional codes",
}: RegionalCodeFilterProps) {
  const [open, setOpen] = React.useState(false);

  const toggleRegionalCode = (code: string) => {
    setSelectedRegionalCodes(
      selectedRegionalCodes.includes(code)
        ? selectedRegionalCodes.filter((c) => c !== code)
        : [...selectedRegionalCodes, code]
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[200px] justify-between"
        >
          {selectedRegionalCodes.length > 0
            ? `${selectedRegionalCodes.length} selected`
            : label}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search regions..." />
          <CommandEmpty>No regional code found.</CommandEmpty>
          <CommandGroup>
            {availableRegionalCodes.map((code) => (
              <CommandItem
                key={code}
                value={code}
                onSelect={() => toggleRegionalCode(code)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedRegionalCodes.includes(code)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {code}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
        
        {selectedRegionalCodes.length > 0 && (
          <div className="border-t p-2 flex flex-wrap gap-1">
            {selectedRegionalCodes.map((code) => (
              <Badge
                key={code}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => toggleRegionalCode(code)}
              >
                {code}
                <span className="ml-1 text-xs">×</span>
              </Badge>
            ))}
            {selectedRegionalCodes.length > 1 && (
              <Badge
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={() => setSelectedRegionalCodes([])}
              >
                Clear all
              </Badge>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 