'use client';

import { useState, useCallback } from 'react';
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/icons";
import { debounce } from 'lodash';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
  department: string;
}

interface UserSelectorProps {
  value: string | null;
  onChange: (user: User) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function UserSelector({
  value,
  onChange,
  disabled = false,
  placeholder = "Select User"
}: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  const searchUser = useCallback(async (search: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/user/search?search=${search}`);
      const { data } = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearchUser = useCallback(
    debounce((search: string) => {
      searchUser(search);
    }, 600),
    [searchUser]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearchUser(value);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      searchUser(searchTerm || '');
    }
  };

  const getDisplayName = (user: User) => `${user.firstName} ${user.lastName}`;
  
  const selectedUser = users.find(user => user.username === value);
  const displayValue = selectedUser ? getDisplayName(selectedUser) : value;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full"
          disabled={disabled}
        >
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ maxHeight: '300px', width: '300px' }}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search users..."
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
              No users found.
            </CommandEmpty>
          )}

          <div className="max-h-[200px] overflow-y-auto">
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.username}
                  onSelect={() => {
                    if (value === user.username) {
                      onChange({...user, username: null as unknown as string});
                    } else {
                      onChange(user);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.username ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{getDisplayName(user)}</span>
                    <span className="text-xs text-muted-foreground">{user.username} - {user.department}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 