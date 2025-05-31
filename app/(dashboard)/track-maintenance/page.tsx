'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Plus, Copy, Edit, Trash } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TrackCity {
  id: string;
  _id?: string; // MongoDB ObjectId
  name: string;
  partyCode: string | null;
  sectionId: string;
  position: number;
}

interface TrackSection {
  id: string;
  _id?: string; // MongoDB ObjectId
  name: string;
  boardId: string;
  position: number;
  isFixedDay: boolean;
  cities: TrackCity[];
}

interface TrackBoard {
  id: string;
  _id?: string; // MongoDB ObjectId
  name: string;
  description: string | null;
  sections: TrackSection[];
}

export default function TrackMaintenancePage() {
  const router = useRouter();
  const [boards, setBoards] = useState<TrackBoard[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedBoard, setSelectedBoard] = useState<TrackBoard | null>(null);
  const [duplicateBoardName, setDuplicateBoardName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBoardsLoading, setIsBoardsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  
  // Fetch boards on component mount
  useEffect(() => {
    fetchBoards();
  }, []);
  
  const fetchBoards = async () => {
    setIsBoardsLoading(true);
    try {
      const response = await fetch('/api/track-maintenance');
      if (!response.ok) {
        throw new Error('Failed to fetch boards');
      }
      
      const data = await response.json();
      setBoards(data);
    } catch (error) {
      console.error('Error fetching boards:', error);
      toast.error('Failed to load track boards');
    } finally {
      setIsBoardsLoading(false);
    }
  };
  
  const formatBoardUrl = (board: TrackBoard) => {
    // Replace spaces with underscores and add board ID at the end
    const nameSlug = board.name.replace(/\s+/g, '_');
    return `/track-maintenance/${nameSlug}_${board.id}`;
  };
  
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      toast.error('Board name is required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/track-maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDescription,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create board');
      }
      
      const newBoard = await response.json();
      setBoards([...boards, newBoard]);
      setNewBoardName('');
      setNewBoardDescription('');
      setIsCreateDialogOpen(false);
      toast.success('Board created successfully');
      
      // Navigate to the new board with formatted URL
      router.push(formatBoardUrl(newBoard));
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error('Failed to create board');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDuplicateBoard = async () => {
    if (!selectedBoard) return;
    if (!duplicateBoardName.trim()) {
      toast.error('New board name is required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/track-maintenance/board/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId: selectedBoard.id,
          newName: duplicateBoardName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to duplicate board');
      }
      
      const duplicatedBoard = await response.json();
      await fetchBoards(); // Refresh boards
      setDuplicateBoardName('');
      setIsDuplicateDialogOpen(false);
      toast.success('Board duplicated successfully');
      
      // Navigate to the new board with formatted URL
      router.push(formatBoardUrl(duplicatedBoard));
    } catch (error) {
      console.error('Error duplicating board:', error);
      toast.error('Failed to duplicate board');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdateBoard = async () => {
    if (!selectedBoard) return;
    if (!newBoardName.trim()) {
      toast.error('Board name is required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/track-maintenance/board/${selectedBoard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDescription,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update board');
      }
      
      await fetchBoards(); // Refresh boards
      setIsEditDialogOpen(false);
      toast.success('Board updated successfully');
    } catch (error) {
      console.error('Error updating board:', error);
      toast.error('Failed to update board');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteBoard = async (boardId: string) => {
    try {
      const response = await fetch(`/api/track-maintenance/board/${boardId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete board');
      }
      
      setBoards(boards.filter(board => board.id !== boardId));
      toast.success('Board deleted successfully');
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Failed to delete board');
    } finally {
      setIsDeleteDialogOpen(false);
      setBoardToDelete(null);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Track Maintenance</h1>
          <p className="text-muted-foreground">
            Manage day-wise party and city track planning boards
          </p>
        </div>
        
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Board
        </Button>
      </div>
      
      {isBoardsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
              </CardHeader>
              
              <CardContent>
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-3 border-t">
                <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No track boards found</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create Your First Board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Card key={board.id || board._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="truncate">{board.name}</CardTitle>
                <CardDescription className="truncate">
                  {board.description || 'No description'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>
                    {board.sections.length} sections with {board.sections.reduce(
                      (sum, section) => sum + section.cities.length,
                      0
                    )} cities
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-3 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => router.push(formatBoardUrl(board))}
                >
                  View Board
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <span className="sr-only">Open menu</span>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                      >
                        <path
                          d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedBoard(board);
                        setNewBoardName(board.name);
                        setNewBoardDescription(board.description || '');
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedBoard(board);
                        setDuplicateBoardName(`Copy of ${board.name}`);
                        setIsDuplicateDialogOpen(true);
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setBoardToDelete(board.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Board Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Create a new track board for organizing cities by day.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Board Name</Label>
              <Input
                id="name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Enter board name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newBoardDescription}
                onChange={(e) => setNewBoardDescription(e.target.value)}
                placeholder="Enter board description"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBoard} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Duplicate Board Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Board</DialogTitle>
            <DialogDescription>
              Create a copy of this board with all its sections and cities.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicateName">New Board Name</Label>
              <Input
                id="duplicateName"
                value={duplicateBoardName}
                onChange={(e) => setDuplicateBoardName(e.target.value)}
                placeholder="Enter new board name"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDuplicateDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleDuplicateBoard} disabled={isLoading}>
              {isLoading ? 'Duplicating...' : 'Duplicate Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Board Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
            <DialogDescription>
              Update board name and description.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Board Name</Label>
              <Input
                id="editName"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Enter board name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description (Optional)</Label>
              <Textarea
                id="editDescription"
                value={newBoardDescription}
                onChange={(e) => setNewBoardDescription(e.target.value)}
                placeholder="Enter board description"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateBoard} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              Delete Board
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete this board? This action cannot be undone and all sections and cities within this board will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => boardToDelete && handleDeleteBoard(boardToDelete)}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
            >
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 