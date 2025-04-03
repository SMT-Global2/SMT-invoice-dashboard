import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BankSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const banks = [
  'Allahabad Bank',
  'Andhra Bank',
  'Axis Bank',
  'Bank of Baroda',
  'Bank of India', 
  'Bank of Maharashtra',
  'Canara Bank',
  'Central Bank of India',
  'City Union Bank',
  'Corporation Bank',
  'Deutsche Bank',
  'Dhanlaxmi Bank',
  'Federal Bank',
  'ICICI Bank',
  'IDBI Bank',
  'Indian Bank',
  'Indian Overseas Bank',
  'IndusInd Bank',
  'Jammu and Kashmir Bank',
  'Karnataka Bank Ltd',
  'Kotak Bank',
  'Laxmi Vilas Bank',
  'Oriental Bank of Commerce',
  'Punjab & Sind Bank',
  'Punjab National Bank', 
  'South Indian Bank',
  'State Bank of India',
  'Syndicate Bank',
  'UCO Bank',
  'Union Bank of India',
  'United Bank of India',
  'Yes Bank Ltd'
];


export function BankSelector({
  value,
  onChange,
  disabled = false,
  placeholder = "Select bank",
}: BankSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter banks based on search term
  const filteredBanks = banks.filter(bank => 
    bank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add the current value to the list if it's not already there
  // This handles custom entries
  useEffect(() => {
    if (value && !banks.includes(value) && value !== searchTerm) {
      setSearchTerm(value);
    }
  }, [value, banks]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search banks..."
            value={searchTerm}
            onValueChange={(value) => {
              setSearchTerm(value);
              // If user is typing, update the form value
              if (value) {
                onChange(value);
              }
            }}
          />
          <CommandEmpty>
            {searchTerm ? (
              <p className="p-2 text-sm text-muted-foreground">
                Press enter to use "{searchTerm}"
              </p>
            ) : (
              "No banks found."
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-y-auto">
            {filteredBanks.map((bank) => (
              <CommandItem
                key={bank}
                value={bank}
                onSelect={() => {
                  onChange(bank);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === bank ? "opacity-100" : "opacity-0"
                  )}
                />
                {bank}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 