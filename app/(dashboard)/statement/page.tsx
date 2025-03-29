'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  FileText, 
  Camera, 
  Save, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle,
  Edit,
  FileDown,
  Calendar,
  X,
  MapPin,
  Clock,
  Info,
  Upload,
  Eye,
  FileUp,
  Loader2,
  Trash2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStatements } from '@/store/useStatement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Statement, Report, parseOutstandingReport } from '@/lib/statement-service';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShowImage } from '@/components/show-image';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LucideIcon } from 'lucide-react';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Import the extracted components
import PartyRow from './_components/PartyRow';
import EmptyState from './_components/EmptyState';

// CSS keyframes for shimmer animation
const shimmerAnimation = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

export default function StatementsPage() {
  const {
    statements,
    isLoading,
    togglePartyExpand,
    isPartyExpanded,
    downloadPartyPDF,
    capturedImages,
    hasPartyImage,
    isPartySaved,
    captureStatementImage,
    savePartyImage,
    updateStatementName,
    fetchStatements,
    savedParties
  } = useStatements();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('0');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showOnlySaved, setShowOnlySaved] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [statementToDelete, setStatementToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTabRect, setActiveTabRect] = useState({ left: 4, width: 100 });
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Handle statement name edit
  const startEditingName = (statementId: string, currentName: string): void => {
    setNewName(currentName);
    setIsEditingName(statementId);
  };

  const saveStatementName = (id: string): void => {
    if (newName.trim()) {
      updateStatementName(id, newName.trim());
    }
    setIsEditingName(null);
  };

  // Format date for display
  const formatDate = (dateStr: string): string => !dateStr ? '' : dateStr;
  
  // Format date safely
  const formatDateSafe = (date: Date | null): string => {
    if (!date) return 'Select date';
    try {
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      return 'Select date';
    }
  };

  // Clear all filters
  const clearAllFilters = (): void => {
    setSearchTerm('');
    setSelectedDate(new Date());
    setShowOnlySaved(false);
  };

  // Calculate saved count
  const calculateSavedCount = (statement: Statement): string => {
    const totalParties = statement.reports.length;
    const savedCount = statement.reports.filter(party => isPartySaved(party.partyCode)).length;
    return `${savedCount}/${totalParties}`;
  };

  // Process the file and upload to S3, then save to database
  const processAndUploadFile = useCallback(async (file: File): Promise<void> => {
    if (!selectedDate) {
      toast({
        title: "Date Selection Required",
        description: "Please select a date for this statement",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Step 1: Parse the file content
      const content = await readFileContent(file);
      const parsedStatement = parseOutstandingReport(content, file.name);
      
      if (!parsedStatement.reports.length) {
        throw new Error('No valid statement data found in the file');
      }
      
      // Step 3: Prepare report data for each party
      const reports = parsedStatement.reports.map(party => ({
        title: `${party.partyCode} - ${party.partyName}`,
        tableData: party,
        saved: false,
        images: []
      }));
      
      // Step 4: Send data to backend
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const response = await axios.post('/api/statement', {
        fileUrl: 'NOT_SAVING_IN_S3_FOR_NOW',
        reports,
        date: formattedDate
      });
      
      // Step 5: Update UI with new data
      if (response.data && response.data.success) {
        toast({
          title: "Statement Uploaded",
          description: `Successfully processed and saved statement with ${parsedStatement.reports.length} parties`,
        });
        
        // Refresh statements for the selected date
        await fetchStatements(selectedDate);
      } else {
        throw new Error('Failed to save statement data');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error Processing File",
        description: error instanceof Error ? error.message : "Failed to process and upload the file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedDate, fetchStatements]);

  // Helper function to read file content as text
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read the file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading the file'));
      };
      
      reader.readAsText(file);
    });
  };

  // Handle date change
  const handleDateChange = useCallback(async (date: Date | undefined) => {
    const newDate = date || new Date();
    setSelectedDate(newDate);
    try {
      await fetchStatements(newDate);
    } catch (error) {
      console.error('Error fetching statements:', error);
    }
  }, [fetchStatements]);

  // Handle statement deletion
  const handleDeleteStatement = async (statementId: string) => {
    setIsDeleting(true);
    try {
      const response = await axios.delete(`/api/statement?id=${statementId}`);
      
      if (response.data && response.data.success) {
        toast({
          title: "Statement Deleted",
          description: "Statement has been successfully deleted.",
        });
        
        // Refresh statements after deletion
        if (selectedDate) {
          await fetchStatements(selectedDate);
        }
        
        // If the active tab was deleted, reset to the first available tab
        if (activeTab === statementId && statements.length > 0) {
          setActiveTab(statements[0].id);
        }
      } else {
        throw new Error('Failed to delete statement');
      }
    } catch (error) {
      console.error('Error deleting statement:', error);
      toast({
        title: "Error Deleting Statement",
        description: error instanceof Error ? error.message : "Failed to delete the statement",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setStatementToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Fetch statements when component mounts or date changes
  useEffect(() => {
    if (selectedDate) {
      fetchStatements(selectedDate).catch(console.error);
    }
  }, [selectedDate, fetchStatements]);

  // Set active tab to first statement when statements change
  useEffect(() => {
    if (statements.length > 0 && (!activeTab || !statements.find(s => s.id === activeTab))) {
      setActiveTab(statements[0].id);
    }
  }, [statements, activeTab]);

  // Update the position of the active tab indicator
  useEffect(() => {
    const updateActiveTabPosition = () => {
      if (!activeTabRef.current || !tabsContainerRef.current) return;
      
      const containerRect = tabsContainerRef.current.getBoundingClientRect();
      const tabRect = activeTabRef.current.getBoundingClientRect();
      
      setActiveTabRect({
        left: tabRect.left - containerRect.left + 4,
        width: tabRect.width - 8
      });
    };

    // Initial position
    updateActiveTabPosition();
    
    // Update on resize
    window.addEventListener('resize', updateActiveTabPosition);
    
    return () => {
      window.removeEventListener('resize', updateActiveTabPosition);
    };
  }, [activeTab]);

  // Generate empty state messages based on conditions
  const getNoStatementsMessage = (): string => {
    return selectedDate
      ? `No statements found for ${formatDateSafe(selectedDate)}`
      : 'No statements available';
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Add the keyframes to the page */}
      <style jsx global>{shimmerAnimation}</style>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Daily Statements</h1>
        <div className="flex flex-col w-full sm:w-auto items-end">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => document.getElementById('header-file-upload')?.click()}
              disabled={isLoading || isUploading}
              variant="outline"
              className="bg-primary/5 border-primary/20 hover:bg-primary/10"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
            <input 
              id="header-file-upload" 
              type="file" 
              className="hidden" 
              accept=".txt,.csv,.xls,.xlsx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && !isUploading) {
                  processAndUploadFile(e.target.files[0]);
                  // Clear the input value so the same file can be selected again
                  e.target.value = '';
                }
              }}
              disabled={isUploading}
            />
          </div>
        </div>
      </div>

      {/* Search and filter controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search input */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by party code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Date filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto">
              <Calendar className="h-4 w-4 mr-2" />
              {formatDateSafe(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={selectedDate ?? undefined}
              onSelect={handleDateChange}
              initialFocus
            />
            <div className="p-2 border-t flex justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDateChange(new Date())}
              >
                Today
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Saved filter */}
        <div className="flex items-center space-x-2 border rounded-md p-2 bg-background">
          <Switch 
            id="show-saved" 
            checked={showOnlySaved}
            onCheckedChange={setShowOnlySaved}
          />
          <Label htmlFor="show-saved">Saved Only</Label>
        </div>
        
        {/* Clear Filters button */}
        {(searchTerm || showOnlySaved) && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearAllFilters}
            className="whitespace-nowrap"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Show empty state if no statements */}
      {statements.length === 0 && !isLoading && (
        <EmptyState
          icon={Calendar}
          message={getNoStatementsMessage()}
          showUpload={true}
          handleFileUpload={processAndUploadFile}
          isUploading={isUploading}
        />
      )}

      {/* Main content with statements */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Improved Tabs UI */}
        <div className="relative mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Active Statements</span>
              {statements.length > 0 && (
                <Badge variant="outline" className="ml-2 font-mono bg-primary/5 text-primary">
                  {statements.length}
                </Badge>
              )}
            </h3>
          </div>
          
          <div className="relative">
            <ScrollArea className="w-full max-w-full rounded-lg bg-gradient-to-b from-card/40 to-card border border-primary/10 shadow-lg shadow-primary/5">
              <div className="p-1 relative" ref={tabsContainerRef}>
                {/* Active indicator that slides under the active tab */}
                {statements.length > 0 && activeTab && (
                  <div 
                    className="absolute h-[calc(100%-8px)] top-1 transition-all duration-300 ease-in-out rounded-md bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 shadow-sm z-0"
                    style={{
                      left: activeTabRect.left,
                      width: activeTabRect.width,
                    }}
                  />
                )}

                <TabsList className="h-auto bg-transparent justify-start p-1 pt-2 w-full relative z-10 flex gap-1">
                  {statements.map((statement, index) => {
                    const savedCount = calculateSavedCount(statement);
                    const isActive = activeTab === statement.id;
                    const isSaved = savedCount.startsWith('0') ? false : true;
                    
                    return (
                      <div 
                        key={statement.id} 
                        className="relative group flex-shrink-0"
                      >
                        <TabsTrigger 
                          value={statement.id}
                          data-value={statement.id}
                          ref={isActive ? activeTabRef : null}
                          className={`
                            relative rounded-md px-3 pt-3 pb-2.5 text-sm font-medium
                            transition-all duration-300 min-w-[130px] max-w-[200px]
                            flex flex-col items-start gap-2 overflow-visible
                            border border-transparent
                            ${isActive ? 
                              'text-primary shadow-sm bg-transparent border-primary/20' : 
                              'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
                            hover:scale-[1.02] active:scale-[0.98] transform
                          `}
                          onMouseEnter={() => {
                            if (!isActive) {
                              const el = document.querySelector(`[data-value="${statement.id}"]`);
                              if (el) {
                                el.classList.add('bg-muted/30');
                              }
                            }
                          }}
                          onMouseLeave={() => {
                            if (!isActive) {
                              const el = document.querySelector(`[data-value="${statement.id}"]`);
                              if (el) {
                                el.classList.remove('bg-muted/30');
                              }
                            }
                          }}
                        >
                          <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                            {isSaved && (
                              <div className="relative">
                                <CheckCircle className="h-3 w-3 text-primary/80" />
                                <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 h-full w-full"></span>
                              </div>
                            )}

                            <AlertDialog open={showDeleteConfirm && statementToDelete === statement.id} onOpenChange={setShowDeleteConfirm}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`
                                    h-5 w-5 p-0 rounded-full
                                    opacity-0 group-hover:opacity-80
                                    hover:opacity-100 hover:bg-destructive/10
                                    transition-all duration-200
                                  `}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatementToDelete(statement.id);
                                    setShowDeleteConfirm(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-xl">Delete Statement</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    Are you sure you want to delete this statement? This action cannot be undone.
                                    <div className="mt-3 p-2 border rounded-md bg-muted/30">
                                      <p className="font-medium text-foreground">{statement.name}</p>
                                      <p className="text-xs mt-1 text-muted-foreground">Contains {statement.reports.length} reports</p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="font-medium">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteStatement(statement.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>Delete</>
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          <div className="flex flex-col items-start w-full gap-0.5">
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 w-full">
                                    <span className="truncate max-w-[110px] font-medium" title={statement.name}>
                                      {statement.name}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                  <p>{statement.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{statement.reports.length} reports</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary/40 to-primary rounded-full transition-all duration-300 ease-out"
                                  style={{ 
                                    width: `${(parseInt(savedCount.split('/')[0]) / parseInt(savedCount.split('/')[1]) * 100) || 0}%` 
                                  }}
                                >
                                </div>
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">{savedCount}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center text-[10px] gap-1.5 text-muted-foreground mt-0.5">
                            <Calendar className="h-3 w-3" />
                            <span className="opacity-80">{formatDate(statement.reportDate)}</span>
                          </div>
                        </TabsTrigger>
                        
                        {/* Glowing effect on active tab hover */}
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/5 blur-sm rounded-md -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}
                      </div>
                    );
                  })}
                </TabsList>
              </div>
            </ScrollArea>
            
            {/* Tab navigation controls */}
            {statements.length > 3 && (
              <div className="flex gap-1 absolute -bottom-8 right-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-card/80 backdrop-blur-sm shadow-sm">
                  <ChevronDown className="h-4 w-4 rotate-90" />
                  <span className="sr-only">Scroll Left</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-card/80 backdrop-blur-sm shadow-sm">
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                  <span className="sr-only">Scroll Right</span>
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Tab content */}
        {statements.map((statement, index) => (
          <TabsContent key={index} value={statement.id} className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  {isEditingName === statement.id ? (
                    <div className="flex items-center space-x-2">
                      <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button size="sm" onClick={() => saveStatementName(statement.id)}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <h2 className="text-xl font-semibold truncate max-w-md" title={statement.name}>
                        {statement.name}
                      </h2>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => startEditingName(statement.id, statement.name)}
                        className="ml-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      <span>{formatDate(statement.reportDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{statement.reportDate}</span>
                    </div>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-1 mt-1">
                    <Info className="h-4 w-4" />
                    <span>Click on a party to expand details</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statement.reports.length > 0 ? (
                  <div className="space-y-4">
                    {statement.reports.map((party, idx) => (
                      <PartyRow 
                        key={idx}
                        party={party} 
                        statement={statement} 
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    message="No parties match your search criteria"
                    buttonText={searchTerm ? "Clear search" : undefined}
                    buttonAction={searchTerm ? () => setSearchTerm('') : undefined}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 