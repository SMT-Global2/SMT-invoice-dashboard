'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Plus, Copy, Edit, Trash, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
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
// @ts-ignore-next-line: no types for react-collapse
import { Collapse } from 'react-collapse';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<TrackSection | null>(null);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [isEditSectionDialogOpen, setIsEditSectionDialogOpen] = useState(false);
  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [sectionToDelete, setSectionToDelete] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<TrackCity | null>(null);
  const [isAddCityDialogOpen, setIsAddCityDialogOpen] = useState(false);
  const [isEditCityDialogOpen, setIsEditCityDialogOpen] = useState(false);
  const [isDeleteCityDialogOpen, setIsDeleteCityDialogOpen] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityPartyCode, setNewCityPartyCode] = useState('');
  const [cityToDelete, setCityToDelete] = useState<string>('');
  const [citySearch, setCitySearch] = useState('');
  const [cityOpen, setCityOpen] = useState<Record<string, boolean>>({});
  const [showAllCities, setShowAllCities] = useState(false);
  const cityList = useMemo(() => {
    const cityMap: Record<string, { count: number, locations: { board: string, section: string }[] }> = {};
    boards.forEach(board => {
      board.sections.forEach(section => {
        section.cities.forEach(city => {
          const key = city.name.trim().toLowerCase();
          if (!cityMap[key]) {
            cityMap[key] = { count: 0, locations: [] };
          }
          cityMap[key].count += 1;
          cityMap[key].locations.push({ board: board.name, section: section.name });
        });
      });
    });
    return Object.entries(cityMap).sort((a, b) => b[1].count - a[1].count);
  }, [boards]);
  const filteredCities = useMemo(() => cityList.filter(([name]) => name.includes(citySearch.trim().toLowerCase())), [cityList, citySearch]);
  
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
      setBoards([...boards, { ...newBoard, sections: [] }]);
      setNewBoardName('');
      setNewBoardDescription('');
      setIsCreateDialogOpen(false);
      toast.success('Board created successfully');
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
  
  const handleAddSection = async () => {
    if (!selectedBoard || !newSectionName.trim()) {
      if (selectedBoard && !newSectionName.trim()) toast.error('Section name is required');
      return;
    }
    try {
      const response = await fetch('/api/track-maintenance/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: selectedBoard.id, name: newSectionName }),
      });
      if (!response.ok) throw new Error('Failed to add section');
      const newSection = await response.json();
      setBoards(boards => boards.map(board =>
        board.id === selectedBoard.id
          ? { ...board, sections: [...board.sections, newSection] }
          : board
      ));
      setIsAddSectionDialogOpen(false);
      setNewSectionName('');
      toast.success('Section added!');
    } catch (err) {
      toast.error('Failed to add section');
    }
  };
  
  const handleEditSection = async () => {
    if (!selectedSection || !newSectionName.trim()) {
      if (selectedSection && !newSectionName.trim()) toast.error('Section name is required');
      return;
    }
    try {
      const response = await fetch(`/api/track-maintenance/section/${selectedSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSectionName }),
      });
      if (!response.ok) throw new Error('Failed to update section');
      const updatedSection = await response.json();
      setBoards(boards => boards.map(board =>
        board.id === selectedBoard?.id
          ? { ...board, sections: board.sections.map(s => s.id === updatedSection.id ? updatedSection : s) }
          : board
      ));
      setIsEditSectionDialogOpen(false);
      setNewSectionName('');
      toast.success('Section updated!');
    } catch (err) {
      toast.error('Failed to update section');
    }
  };
  
  const handleDeleteSection = async () => {
    if (!sectionToDelete || !selectedBoard) return;
    try {
      const response = await fetch(`/api/track-maintenance/section/${sectionToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete section');
      setBoards(boards => boards.map(board =>
        board.id === selectedBoard.id
          ? { ...board, sections: board.sections.filter(s => s.id !== sectionToDelete) }
          : board
      ));
      setIsDeleteSectionDialogOpen(false);
      setSectionToDelete('');
      toast.success('Section deleted!');
    } catch (err) {
      toast.error('Failed to delete section');
    }
  };
  
  const handleAddCity = async () => {
    if (!selectedSection || !newCityName.trim()) {
      if (selectedSection && !newCityName.trim()) toast.error('City name is required');
      return;
    }
    try {
      const response = await fetch('/api/track-maintenance/city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: selectedSection.id, name: newCityName, partyCode: newCityPartyCode }),
      });
      if (!response.ok) throw new Error('Failed to add city');
      const newCity = await response.json();
      setBoards(boards => boards.map(board =>
        board.sections.some(s => s.id === selectedSection.id)
          ? { ...board, sections: board.sections.map(s =>
              s.id === selectedSection.id ? { ...s, cities: [...s.cities, newCity] } : s
            ) }
          : board
      ));
      setIsAddCityDialogOpen(false);
      setNewCityName('');
      setNewCityPartyCode('');
      toast.success('City added!');
    } catch (err) {
      toast.error('Failed to add city');
    }
  };
  
  const handleEditCity = async () => {
    if (!selectedCity || !newCityName.trim()) {
      if (selectedCity && !newCityName.trim()) toast.error('City name is required');
      return;
    }
    try {
      const response = await fetch(`/api/track-maintenance/city/${selectedCity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCityName, partyCode: newCityPartyCode }),
      });
      if (!response.ok) throw new Error('Failed to update city');
      const updatedCity = await response.json();
      setBoards(boards => boards.map(board =>
        board.sections.some(s => s.id === selectedCity.sectionId)
          ? { ...board, sections: board.sections.map(s =>
              s.id === selectedCity.sectionId ? { ...s, cities: s.cities.map(c => c.id === updatedCity.id ? updatedCity : c) } : s
            ) }
          : board
      ));
      setIsEditCityDialogOpen(false);
      setNewCityName('');
      setNewCityPartyCode('');
      toast.success('City updated!');
    } catch (err) {
      toast.error('Failed to update city');
    }
  };
  
  const handleDeleteCity = async () => {
    if (!cityToDelete || !selectedSection) return;
    try {
      const response = await fetch(`/api/track-maintenance/city/${cityToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete city');
      setBoards(boards => boards.map(board =>
        board.sections.some(s => s.id === selectedSection.id)
          ? { ...board, sections: board.sections.map(s =>
              s.id === selectedSection.id ? { ...s, cities: s.cities.filter(c => c.id !== cityToDelete) } : s
            ) }
          : board
      ));
      setIsDeleteCityDialogOpen(false);
      setCityToDelete('');
      toast.success('City deleted!');
    } catch (err) {
      toast.error('Failed to delete city');
    }
  };
  
  const handleCityDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    // Find source and destination section
    const sourceSectionId = source.droppableId;
    const destSectionId = destination.droppableId;
    if (sourceSectionId === destSectionId && source.index === destination.index) return;
    // Find the city object
    const sourceBoard = boards.find(b => b.sections.some(s => s.id === sourceSectionId));
    const sourceSection = sourceBoard?.sections.find(s => s.id === sourceSectionId);
    const city = sourceSection?.cities[source.index];
    if (!city) return;
    // Optimistically update UI
    setBoards(prevBoards => prevBoards.map(board => {
      if (!board.sections.some(s => s.id === sourceSectionId || s.id === destSectionId)) return board;
      return {
        ...board,
        sections: board.sections.map(section => {
          if (section.id === sourceSectionId) {
            // Remove city from source
            const newCities = [...section.cities];
            newCities.splice(source.index, 1);
            return { ...section, cities: newCities };
          } else if (section.id === destSectionId) {
            // Insert city into destination
            const newCities = [...section.cities];
            newCities.splice(destination.index, 0, city);
            return { ...section, cities: newCities };
          } else {
            return section;
          }
        })
      };
    }));
    // Update backend
    try {
      await fetch(`/api/track-maintenance/city/${draggableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: destSectionId, position: destination.index }),
      });
    } catch (err) {
      toast.error('Failed to move city');
      // Optionally: refetch boards to sync
      fetchBoards();
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
      
      {/* All Cities Summary: Searchable, Collapsible List */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none" onClick={() => setShowAllCities(v => !v)}>
          <CardTitle>All Cities Across Boards</CardTitle>
          <Button variant="ghost" size="icon" tabIndex={-1} aria-label="Toggle All Cities">
            {showAllCities ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </CardHeader>
        {showAllCities && (
          <CardContent>
            {boards.length === 0 ? (
              <div className="text-muted-foreground">No boards found.</div>
            ) : cityList.length === 0 ? (
              <div className="text-muted-foreground">No cities found.</div>
            ) : (
              <div>
                <Input
                  placeholder="Search city..."
                  className="mb-4 max-w-xs"
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredCities.map(([name, info]: [string, { count: number, locations: { board: string, section: string }[] }]) => (
                    <div key={name} className="bg-background border rounded p-3 flex flex-col">
                      <button
                        className="flex items-center justify-between w-full font-medium text-left truncate focus:outline-none hover:bg-muted px-2 py-1 rounded"
                        onClick={() => setCityOpen(o => ({ ...o, [name]: !o[name] }))}
                      >
                        <span className="truncate max-w-[120px]">{name[0].toUpperCase() + name.slice(1)}</span>
                        <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">{info.count}</span>
                        <span className="ml-auto text-muted-foreground">{cityOpen[name] ? '▲' : '▼'}</span>
                      </button>
                      {cityOpen[name] && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">Locations:</div>
                          <ul className="flex flex-col gap-1">
                            {info.locations.map((loc: { board: string, section: string }, idx: number) => (
                              <li key={idx} className="bg-muted px-2 py-1 rounded text-xs">
                                {loc.board} &gt; {loc.section}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
      {isBoardsLoading ? (
        <div className="grid grid-cols-1 gap-6">
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
        <div className="grid grid-cols-1 gap-6">
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
                  onClick={() => setExpandedBoardId(expandedBoardId === board.id ? null : board.id)}
                  aria-expanded={expandedBoardId === board.id}
                  aria-controls={`board-sections-${board.id}`}
                  className="flex items-center gap-2"
                >
                  {expandedBoardId === board.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {expandedBoardId === board.id ? 'Hide Sections' : 'Show Sections'}
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
              <Collapse isOpened={expandedBoardId === board.id}>
                <div id={`board-sections-${board.id}`} className="p-4 bg-muted rounded-md mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Sections</span>
                    <Button size="sm" variant="secondary" onClick={() => { setSelectedBoard(board); setIsAddSectionDialogOpen(true); }}> <Plus className="h-4 w-4 mr-1" /> Add Section </Button>
                  </div>
                  {board.sections.length === 0 ? (
                    <div className="text-muted-foreground text-sm">No sections found.</div>
                  ) : (
                    <DragDropContext onDragEnd={handleCityDragEnd}>
                      <div className="flex flex-row gap-4 overflow-x-auto pb-2">
                        {board.sections.map(section => (
                          <div key={section.id} className="min-w-[260px] max-w-xs border rounded p-3 bg-background flex-shrink-0">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{section.name}</span>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => { setSelectedSection(section); setNewSectionName(section.name); setIsEditSectionDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => { setSectionToDelete(section.id); setIsDeleteSectionDialogOpen(true); }}><Trash className="h-4 w-4 text-destructive" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => { setSelectedSection(section); setIsAddCityDialogOpen(true); }}><Plus className="h-4 w-4" /></Button>
                              </div>
                            </div>
                            <div className="pl-2">
                              <Droppable droppableId={section.id} type="city" direction="vertical">
                                {(provided) => (
                                  <ul
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="space-y-1 min-h-[32px]"
                                  >
                                    {section.cities.length === 0 ? (
                                      <div className="text-xs text-muted-foreground">No cities in this section.</div>
                                    ) : (
                                      section.cities.map((city, idx) => (
                                        <Draggable key={city.id} draggableId={city.id} index={idx}>
                                          {(provided) => (
                                            <li
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className="flex items-center gap-2"
                                            >
                                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                                              <span className="flex-1">{city.name}</span>
                                              <Button size="icon" variant="ghost" onClick={() => { setSelectedCity(city); setNewCityName(city.name); setNewCityPartyCode(city.partyCode || ''); setIsEditCityDialogOpen(true); }}><Edit className="h-3 w-3" /></Button>
                                              <Button size="icon" variant="ghost" onClick={() => { setCityToDelete(city.id); setIsDeleteCityDialogOpen(true); }}><Trash className="h-3 w-3 text-destructive" /></Button>
                                            </li>
                                          )}
                                        </Draggable>
                                      ))
                                    )}
                                    {provided.placeholder}
                                  </ul>
                                )}
                              </Droppable>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DragDropContext>
                  )}
                </div>
              </Collapse>
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

      <Dialog open={isAddSectionDialogOpen} onOpenChange={setIsAddSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="sectionName">Section Name</Label>
            <Input
              id="sectionName"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Enter section name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSectionDialogOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleAddSection} disabled={isLoading}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSectionDialogOpen} onOpenChange={setIsEditSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="editSectionName">Section Name</Label>
            <Input
              id="editSectionName"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Enter section name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSectionDialogOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleEditSection} disabled={isLoading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteSectionDialogOpen} onOpenChange={setIsDeleteSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this section?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteSectionDialogOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSection} disabled={isLoading}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCityDialogOpen} onOpenChange={setIsAddCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add City</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="cityName">City Name</Label>
            <Input
              id="cityName"
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              placeholder="Enter city name"
            />
            <Label htmlFor="partyCode">Party Code (optional)</Label>
            <Input
              id="partyCode"
              value={newCityPartyCode}
              onChange={(e) => setNewCityPartyCode(e.target.value)}
              placeholder="Enter party code"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCityDialogOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleAddCity} disabled={isLoading}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCityDialogOpen} onOpenChange={setIsEditCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="editCityName">City Name</Label>
            <Input
              id="editCityName"
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              placeholder="Enter city name"
            />
            <Label htmlFor="editPartyCode">Party Code (optional)</Label>
            <Input
              id="editPartyCode"
              value={newCityPartyCode}
              onChange={(e) => setNewCityPartyCode(e.target.value)}
              placeholder="Enter party code"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCityDialogOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleEditCity} disabled={isLoading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteCityDialogOpen} onOpenChange={setIsDeleteCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete City</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this city?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteCityDialogOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCity} disabled={isLoading}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 