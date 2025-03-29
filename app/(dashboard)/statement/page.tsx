'use client';

import { useState, useCallback } from 'react';
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
  Loader2
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

// Import the extracted components
import PartyRow from './_components/PartyRow';
import EmptyState from './_components/EmptyState';
import { HandlersProps } from './_types';

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
    clearStatements,
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

  // Fetch statements when component mounts or date changes
  useState(() => {
    if (selectedDate) {
      fetchStatements(selectedDate).catch(console.error);
    }
  });

  // Collect handlers for components
  const handlers: HandlersProps = {
    togglePartyExpand,
    isPartyExpanded,
    isPartySaved,
    hasPartyImage,
    capturedImages,
    savedParties,
    captureStatementImage,
    savePartyImage,
    downloadPartyPDF,
    isLoading,
  };

  if (isLoading && !isUploading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-8 w-60 mb-6" />
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Skeleton className="h-10 w-full md:w-3/4" />
          <Skeleton className="h-10 w-full md:w-1/4" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  // Generate empty state messages based on conditions
  const getNoStatementsMessage = (): string => {
    return selectedDate
      ? `No statements found for ${formatDateSafe(selectedDate)}`
      : 'No statements available';
  };

  const getNoMatchMessage = (): string => {
    return selectedDate
      ? `No statements found for ${formatDateSafe(selectedDate)}`
      : 'No statements match your criteria';
  };

  // Add file upload button in header
  const renderHeaderActions = () => (
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
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Daily Statements</h1>
        <div className="flex flex-col w-full sm:w-auto items-end">
          {renderHeaderActions()}
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

      {statements.length > 0 ? (
        <>
          {statements.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="relative overflow-hidden mb-4">
                <ScrollArea className="w-full pb-4">
                  <TabsList className="inline-flex w-full justify-start py-2 px-0 bg-transparent">
                    {statements.map((statement , index) => (
                      <TabsTrigger 
                        key={index} 
                        value={statement.id}
                        className="whitespace-nowrap px-4 sm:px-6 py-3 text-sm sm:text-base font-medium flex-shrink-0 rounded-md data-[state=active]:shadow-md mx-1"
                      >
                        <div className="flex flex-col items-center">
                          <span className="truncate w-full text-center" title={statement.name}>
                            {statement.name}
                          </span>
                          <Badge variant={calculateSavedCount(statement).startsWith('0') ? "outline" : "default"} className="mt-1">
                            {calculateSavedCount(statement)}
                          </Badge>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
              </div>

              {statements.map((statement , index) => (
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
                      {statement.reports.length ? (
                        <div className="space-y-4">
                          {statement.reports.map((party, idx) => (
                            <PartyRow 
                              key={idx}
                              party={party} 
                              statement={statement} 
                              handlers={handlers}
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
          ) : (
            <EmptyState
              icon={Calendar}
              message={getNoMatchMessage()}
              buttonText={undefined}
              buttonAction={undefined}
            />
          )}
        </>
      ) : (
        <EmptyState
          icon={Calendar}
          message={getNoStatementsMessage()}
          showUpload={true}
          handleFileUpload={processAndUploadFile}
          isUploading={isUploading}
        />
      )}
    </div>
  );
} 