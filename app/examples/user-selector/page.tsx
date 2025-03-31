'use client';

import { useState } from 'react';
import { UserSelector, User } from '@/components/user-selector';

export default function UserSelectorExample() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleUserChange = (user: User) => {
    setSelectedUser(user);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">User Selector Example</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Select a User</h2>
          <UserSelector 
            value={selectedUser?.username || null} 
            onChange={handleUserChange} 
          />
        </div>

        {selectedUser && (
          <div className="mt-8 p-4 border rounded-md">
            <h3 className="text-lg font-medium mb-4">Selected User Details</h3>
            <div className="grid gap-2">
              <div>
                <span className="font-medium">Name:</span> {selectedUser.firstName} {selectedUser.lastName}
              </div>
              <div>
                <span className="font-medium">Username:</span> {selectedUser.username}
              </div>
              <div>
                <span className="font-medium">Type:</span> {selectedUser.type}
              </div>
              <div>
                <span className="font-medium">Department:</span> {selectedUser.department}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 