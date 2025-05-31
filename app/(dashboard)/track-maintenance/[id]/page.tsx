'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Plus, Edit, Trash, GripVertical, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function BoardDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  
  // Extract the board ID from the URL parameter
  // The URL format is: /track-maintenance/Board_Name_123456
  // We need to extract the ID part (after the last underscore)
  const paramId = routeParams.id as string;
  const lastUnderscoreIndex = paramId.lastIndexOf('_');
  
  // If there's no underscore, assume the entire string is the ID
  const boardId = lastUnderscoreIndex !== -1 
    ? paramId.substring(lastUnderscoreIndex + 1) 
    : paramId;
    
  const [board, setBoard] = useState<TrackBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [isEditSectionDialogOpen, setIsEditSectionDialogOpen] = useState(false);
  const [isAddCityDialogOpen, setIsAddCityDialogOpen] = useState(false);
  const [isEditCityDialogOpen, setIsEditCityDialogOpen] = useState(false);
  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] = useState(false);
  const [isDeleteCityDialogOpen, setIsDeleteCityDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedSection, setSelectedSection] = useState<TrackSection | null>(null);
  const [newCityName, setNewCityName] = useState('');
  const [newCityPartyCode, setNewCityPartyCode] = useState('');
  const [selectedCity, setSelectedCity] = useState<TrackCity | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<string>('');
  const [cityToDelete, setCityToDelete] = useState<string>('');
  
  useEffect(() => {
    fetchBoard();
  }, [boardId]);
  
  const fetchBoard = async () => {
    setIsLoading(true);
    try {
      // Validate that boardId is non-empty
      if (!boardId || boardId.trim() === '') {
        toast.error('Invalid board ID');
        router.push('/track-maintenance');
        return;
      }
      
      const response = await fetch(`/api/track-maintenance/board/${boardId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch board');
      }
      
      const data = await response.json();
      setBoard(data);
    } catch (error: any) {
      console.error('Error fetching board:', error);
      toast.error(error.message || 'Failed to load board');
      
      // Redirect to the boards list page after a delay
      setTimeout(() => {
        router.push('/track-maintenance');
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      toast.error('Section name is required');
      return;
    }
    
    try {
      const response = await fetch('/api/track-maintenance/section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId: boardId,
          name: newSectionName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add section');
      }
      
      const newSection = await response.json();
      
      // Update state directly instead of re-fetching
      if (board) {
        setBoard({
          ...board,
          sections: [...board.sections, newSection]
        });
      }
      
      setNewSectionName('');
      setIsAddSectionDialogOpen(false);
      toast.success('Section added successfully');
    } catch (error) {
      console.error('Error adding section:', error);
      toast.error('Failed to add section');
    }
  };
  
  const handleUpdateSection = async () => {
    if (!selectedSection) return;
    if (!newSectionName.trim()) {
      toast.error('Section name is required');
      return;
    }
    
    try {
      const response = await fetch(`/api/track-maintenance/section/${selectedSection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSectionName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update section');
      }
      
      const updatedSection = await response.json();
      
      // Update state directly
      if (board) {
        setBoard({
          ...board,
          sections: board.sections.map(section => 
            section.id === updatedSection.id ? updatedSection : section
          )
        });
      }
      
      setIsEditSectionDialogOpen(false);
      toast.success('Section updated successfully');
    } catch (error) {
      console.error('Error updating section:', error);
      toast.error('Failed to update section');
    }
  };
  
  const handleDeleteSection = async (sectionId: string) => {
    try {
      const response = await fetch(`/api/track-maintenance/section/${sectionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete section');
      }
      
      // Update state directly
      if (board) {
        setBoard({
          ...board,
          sections: board.sections.filter(section => section.id !== sectionId)
        });
      }
      
      toast.success('Section deleted successfully');
    } catch (error: any) {
      console.error('Error deleting section:', error);
      toast.error(error.message || 'Failed to delete section');
    } finally {
      setIsDeleteSectionDialogOpen(false);
      setSectionToDelete('');
    }
  };
  
  const handleAddCity = async () => {
    if (!selectedSection) return;
    if (!newCityName.trim()) {
      toast.error('City name is required');
      return;
    }
    
    try {
      const response = await fetch('/api/track-maintenance/city', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionId: selectedSection.id,
          name: newCityName,
          partyCode: newCityPartyCode || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add city');
      }
      
      const newCity = await response.json();
      
      // Update state directly
      if (board) {
        setBoard({
          ...board,
          sections: board.sections.map(section => {
            if (section.id === selectedSection.id) {
              return {
                ...section,
                cities: [...section.cities, newCity]
              };
            }
            return section;
          })
        });
      }
      
      setNewCityName('');
      setNewCityPartyCode('');
      setIsAddCityDialogOpen(false);
      toast.success('City added successfully');
    } catch (error) {
      console.error('Error adding city:', error);
      toast.error('Failed to add city');
    }
  };
  
  const handleUpdateCity = async () => {
    if (!selectedCity) return;
    if (!newCityName.trim()) {
      toast.error('City name is required');
      return;
    }
    
    try {
      const response = await fetch(`/api/track-maintenance/city/${selectedCity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCityName,
          partyCode: newCityPartyCode || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update city');
      }
      
      const updatedCity = await response.json();
      
      // Update state directly
      if (board) {
        setBoard({
          ...board,
          sections: board.sections.map(section => {
            if (section.id === selectedCity.sectionId) {
              return {
                ...section,
                cities: section.cities.map(city => 
                  city.id === updatedCity.id ? updatedCity : city
                )
              };
            }
            return section;
          })
        });
      }
      
      setIsEditCityDialogOpen(false);
      toast.success('City updated successfully');
    } catch (error) {
      console.error('Error updating city:', error);
      toast.error('Failed to update city');
    }
  };
  
  const handleDeleteCity = async (cityId: string) => {
    try {
      const response = await fetch(`/api/track-maintenance/city/${cityId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete city');
      }
      
      // Update state directly
      if (board) {
        setBoard({
          ...board,
          sections: board.sections.map(section => ({
            ...section,
            cities: section.cities.filter(city => city.id !== cityId)
          }))
        });
      }
      
      toast.success('City deleted successfully');
    } catch (error) {
      console.error('Error deleting city:', error);
      toast.error('Failed to delete city');
    } finally {
      setIsDeleteCityDialogOpen(false);
      setCityToDelete('');
    }
  };
  
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;
    
    // Dropped outside the list
    if (!destination) {
      return;
    }
    
    // Check if the item was dropped in a different position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    if (!board) return;
    
    // Handle city drag
    if (type === 'city') {
      const sourceSection = board.sections.find(s => s.id === source.droppableId);
      const destSection = board.sections.find(s => s.id === destination.droppableId);
      
      if (!sourceSection || !destSection) return;
      
      const newBoard = { ...board };
      
      // Get the city being dragged
      const [movedCity] = sourceSection.cities.splice(source.index, 1);
      
      // Insert the city at the new position in the destination section
      destSection.cities.splice(destination.index, 0, {
        ...movedCity,
        sectionId: destination.droppableId,
      });
      
      // Update positions for all cities in affected sections
      sourceSection.cities.forEach((city, index) => {
        city.position = index;
      });
      
      destSection.cities.forEach((city, index) => {
        city.position = index;
      });
      
      // Optimistically update the UI
      setBoard(newBoard);
      
      // Update the city in the database
      try {
        const response = await fetch(`/api/track-maintenance/city/${movedCity.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sectionId: destination.droppableId,
            position: destination.index,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update city position');
        }
      } catch (error) {
        console.error('Error updating city position:', error);
        toast.error('Failed to save the new arrangement');
        // Revert the optimistic update
        fetchBoard();
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Board not found</p>
        <Button onClick={() => router.push('/track-maintenance')}>
          Back to Track Maintenance
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push('/track-maintenance')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">{board.name}</h1>
          {board.description && (
            <p className="text-muted-foreground">{board.description}</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={() => setIsAddSectionDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Section
        </Button>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {board.sections.map((section) => (
            <div key={section.id} className="flex flex-col">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-md font-medium">
                    {section.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setSelectedSection(section);
                        setIsAddCityDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
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
                            setSelectedSection(section);
                            setNewSectionName(section.name);
                            setIsEditSectionDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        {!section.isFixedDay && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSectionToDelete(section.id);
                              setIsDeleteSectionDialogOpen(true);
                            }}
                          >
                            <Trash className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-grow p-2">
                  <Droppable droppableId={section.id} type="city">
                    {(provided: DroppableProvided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="min-h-[200px] space-y-2 p-1"
                      >
                        {section.cities.map((city, index) => (
                          <Draggable
                            key={city.id}
                            draggableId={city.id}
                            index={index}
                          >
                            {(provided: DraggableProvided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="group relative border rounded-md p-3 bg-card shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab text-muted-foreground"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  
                                  <div className="flex-grow">
                                    <div className="font-medium">{city.name}</div>
                                    {/* {city.partyCode && (
                                      <div className="text-xs text-muted-foreground">
                                        {city.partyCode}
                                      </div>
                                    )} */}
                                  </div>
                                  
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => {
                                        setSelectedCity(city);
                                        setNewCityName(city.name);
                                        setNewCityPartyCode(city.partyCode || '');
                                        setIsEditCityDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => {
                                        setCityToDelete(city.id);
                                        setIsDeleteCityDialogOpen(true);
                                      }}
                                    >
                                      <Trash className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </DragDropContext>
      
      {/* Add Section Dialog */}
      <Dialog open={isAddSectionDialogOpen} onOpenChange={setIsAddSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section to organize cities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sectionName">Section Name</Label>
              <Input
                id="sectionName"
                placeholder="Enter section name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSection}>Add Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Section Dialog */}
      <Dialog open={isEditSectionDialogOpen} onOpenChange={setIsEditSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>
              Update the section name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editSectionName">Section Name</Label>
              <Input
                id="editSectionName"
                placeholder="Enter section name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSection}>Update Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add City Dialog */}
      <Dialog open={isAddCityDialogOpen} onOpenChange={setIsAddCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
            <DialogDescription>
              Add a city to the selected section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cityName">City Name</Label>
              <Input
                id="cityName"
                placeholder="Enter city name"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
              />
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="partyCode">Party Code (optional)</Label>
              <Input
                id="partyCode"
                placeholder="Enter party code"
                value={newCityPartyCode}
                onChange={(e) => setNewCityPartyCode(e.target.value)}
              />
            </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCity}>Add City</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit City Dialog */}
      <Dialog open={isEditCityDialogOpen} onOpenChange={setIsEditCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
            <DialogDescription>
              Update the city information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editCityName">City Name</Label>
              <Input
                id="editCityName"
                placeholder="Enter city name"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
              />
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="editPartyCode">Party Code (optional)</Label>
              <Input
                id="editPartyCode"
                placeholder="Enter party code"
                value={newCityPartyCode}
                onChange={(e) => setNewCityPartyCode(e.target.value)}
              />
            </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCity}>Update City</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Section Confirmation Dialog */}
      <Dialog open={isDeleteSectionDialogOpen} onOpenChange={setIsDeleteSectionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <DialogTitle className="text-center">Delete Section</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete this section?<br />
              All cities within this section will also be deleted.<br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteSectionDialogOpen(false);
                setSectionToDelete('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteSection(sectionToDelete)}
            >
              Delete Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete City Confirmation Dialog */}
      <Dialog open={isDeleteCityDialogOpen} onOpenChange={setIsDeleteCityDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <DialogTitle className="text-center">Delete City</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete this city?<br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteCityDialogOpen(false);
                setCityToDelete('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteCity(cityToDelete)}
            >
              Delete City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}