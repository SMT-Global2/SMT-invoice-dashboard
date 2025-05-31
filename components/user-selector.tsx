'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Department } from '@prisma/client';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

interface UserSelectorProps {
  value: string | null;
  onChange: (user: User) => void;
  placeholder?: string;
  disabled?: boolean;
  departmentFilter?: Department;
}

export function UserSelector({ 
  value, 
  onChange, 
  placeholder = 'Select a user', 
  disabled = false, 
  departmentFilter = Department.ALL_ROUNDER
}: UserSelectorProps) 
{
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/list');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const handleValueChange = (userId: string) => {
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      onChange(selectedUser);
    }
  };

  return (
    <Select value={value || undefined} onValueChange={handleValueChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading users..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Users</SelectLabel>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.firstName} {user.lastName} ({user.username})
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
} 