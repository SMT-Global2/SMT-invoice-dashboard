'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
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

interface MultiUserSelectorProps {
  value: string[];
  onChange: (users: User[]) => void;
  disabled?: boolean;
  placeholder?: string;
  departmentFilter?: Department | null;
}

export function MultiUserSelector({
  value,
  onChange,
  disabled = false,
  placeholder = "Select Users",
  departmentFilter = null
}: MultiUserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const searchUsers = useCallback(async (search: string) => {
    try {
      setIsLoading(true);
      const url = new URL('/api/user/search', window.location.origin);
      url.searchParams.set('search', search);
      url.searchParams.set('department', departmentFilter || '');
      const response = await fetch(url);
      const { data } = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [departmentFilter]);

  // Load user data when username values change
  useEffect(() => {
    if (value && value.length > 0) {
      const fetchUsersByUsername = async () => {
        try {
          setIsLoading(true);
          // Get all users that aren't already in selectedUsers
          const usersToFetch = value.filter(username => 
            !selectedUsers.some(user => user.username === username)
          );
          
          if (usersToFetch.length === 0) return;
          
          const fetchPromises = usersToFetch.map(async (username) => {
            const response = await fetch(`/api/user/search?search=${username}`);
            const { data } = await response.json();
            return data.find((user: User) => user.username === username);
          });
          
          const fetchedUsers = await Promise.all(fetchPromises);
          const validUsers = fetchedUsers.filter(Boolean) as User[];
          
          if (validUsers.length > 0) {
            setSelectedUsers(prev => {
              const newUsers = [...prev];
              validUsers.forEach(user => {
                if (!newUsers.some(u => u.username === user.username)) {
                  newUsers.push(user);
                }
              });
              return newUsers;
            });
          }
        } catch (error) {
          console.error('Failed to fetch users by username:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchUsersByUsername();
    } else if (value.length === 0 && selectedUsers.length > 0) {
      setSelectedUsers([]);
    }
  }, [value, selectedUsers]);

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
    const isSelected = selectedUsers.some(u => u.username === user.username);
    
    let newSelectedUsers: User[];
    if (isSelected) {
      newSelectedUsers = selectedUsers.filter(u => u.username !== user.username);
    } else {
      newSelectedUsers = [...selectedUsers, user];
    }
    
    setSelectedUsers(newSelectedUsers);
    onChange(newSelectedUsers);
  };

  const removeUser = (username: string) => {
    const newSelectedUsers = selectedUsers.filter(u => u.username !== username);
    setSelectedUsers(newSelectedUsers);
    onChange(newSelectedUsers);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
            disabled={disabled}
          >
            {selectedUsers.length > 0 
              ? `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected` 
              : placeholder}
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
                {users.map((user) => {
                  const isSelected = selectedUsers.some(u => u.username === user.username);
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.username}
                      onSelect={() => handleUserSelect(user)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <div className="font-medium">{formatUserName(user)}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.username} • {formatDepartment(user.department)}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedUsers.map(user => (
            <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
              {formatUserName(user)}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeUser(user.username)} 
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
} 