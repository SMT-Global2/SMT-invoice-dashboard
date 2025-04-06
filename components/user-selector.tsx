'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/icons";
import { debounce } from 'lodash';
import { UserType, Department } from '@prisma/client';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  type: UserType;
  department: Department[];
}

interface UserSelectorProps {
  value: string | null;
  onChange: (user: User) => void;
  disabled?: boolean;
  placeholder?: string;
  departmentFilter?: Department | null;
}

export function UserSelector({
  value,
  onChange,
  disabled = false,
  placeholder = "Select User",
  departmentFilter = null
}: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const searchUsers = useCallback(async (search: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/user/search?search=${search}&department=${departmentFilter}`);
      const { data } = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user data when username value changes
  useEffect(() => {
    if (value && (!selectedUser || selectedUser.username !== value)) {
      const fetchUserByUsername = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/user/search?search=${value}`);
          const { data } = await response.json();
          const foundUser = data.find((user: User) => user.username === value);
          if (foundUser) {
            setSelectedUser(foundUser);
          }
        } catch (error) {
          console.error('Failed to fetch user by username:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchUserByUsername();
    } else if (!value) {
      setSelectedUser(null);
    }
  }, [value, selectedUser]);

  const debouncedSearchUsers = useCallback(
    debounce((search: string) => {
      searchUsers(search);
    }, 600),
    [searchUsers]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearchUsers(value);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      searchUsers(searchTerm || '');
    }
  };

  const formatUserName = (user: User) => {
    return `${user.firstName} ${user.lastName}`;
  };

  const formatDepartment = (departments: Department[]) => {
    return departments.join(', ');
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    onChange(user);
    setOpen(false);
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
          {selectedUser ? formatUserName(selectedUser) : placeholder}
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
              No user found.
            </CommandEmpty>
          )}

          <div className="max-h-[200px] overflow-y-auto">
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.username}
                  onSelect={() => handleUserSelect(user)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUser?.username === user.username ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <div className="font-medium">{formatUserName(user)}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.username} • {formatDepartment(user.department)}
                    </div>
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