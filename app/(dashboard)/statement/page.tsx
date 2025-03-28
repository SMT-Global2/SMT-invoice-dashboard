'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  FileText, 
  Camera, 
  Save, 
  ChevronDown, 
  ChevronRight, 
  Upload,
  CheckCircle,
  Edit,
  FileDown,
  Eye,
  Calendar,
  Filter,
  X,
  MapPin
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStatements } from '@/lib/services/statement-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Party, Statement } from '@/lib/statement-service';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';

// Content component that uses the context
export default function StatementsContent() {
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
    searchParties,
    loadStatements,
    clearStatements,
    updateStatementName
  } = useStatements();

  // Store statements with upload dates
  const [statementsWithDates, setStatementsWithDates] = useState<(Statement & { uploadDate: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('0');
  const [filteredData, setFilteredData] = useState<(Statement & { uploadDate: string })[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showOnlySaved, setShowOnlySaved] = useState<boolean>(false);
  const [savedParties, setSavedParties] = useState<{ [key: string]: { timestamp: string, coordinates: { lat: number, lng: number } | null } }>({});
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [filteredStatements, setFilteredStatements] = useState<(Statement & { uploadDate: string })[]>([]);
  const [mounted, setMounted] = useState(true);


  // Update statements with upload dates whenever statements change
  useEffect(() => {
    if (!mounted) return;
    
    if (statements.length > 0) {
      // For each statement, assign today's date as the upload date if it doesn't have one yet
      const today = format(new Date(), 'dd/MM/yyyy');
      
      const updatedStatements = statements.map(statement => {
        // Try to find existing statement with upload date
        const existingStatement = statementsWithDates.find(s => s.id === statement.id);
        
        return {
          ...statement,
          // Keep existing upload date if found, otherwise use today
          uploadDate: existingStatement?.uploadDate || today
        };
      });
      
      setStatementsWithDates(updatedStatements);
    } else {
      setStatementsWithDates([]);
    }
  }, [statements, mounted]);

  // Handle file upload
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement> | { target: { files: FileList } }) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      // Process all selected files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Uploading file ${i + 1} of ${files.length}: ${file.name}`);
        await loadStatements(file);
      }
      setUploadStatus('');
      
      // Set the active tab to the first statement if we have one
      if (statements.length > 0) {
        setActiveTab(statements[0].id);
      }
      
      // Set today's date when uploading
      setSelectedDate(new Date());
    } catch (error) {
      // Error is already handled in the context
      console.error('Failed to load statements:', error);
      setUploadStatus('');
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr;
  };

  // Handle statement name edit
  const startEditingName = (statementId: string, currentName: string) => {
    setNewName(currentName);
    setIsEditingName(statementId);
  };

  const saveStatementName = (id: string) => {
    if (newName.trim()) {
      updateStatementName(id, newName.trim());
    }
    setIsEditingName(null);
  };

  // Improved search that looks for complete strings rather than individual letters
  const searchCompleteString = (text: string, searchTerm: string): boolean => {
    if (!searchTerm || !text) return false;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };
  
  // Set active tab if not set and we have statements
  useEffect(() => {
    if (!mounted) return;
    
    if (filteredStatements.length > 0 && (!activeTab || !filteredStatements.find(s => s.id === activeTab))) {
      setActiveTab(filteredStatements[0].id);
    }
  }, [filteredStatements, activeTab, mounted]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedDate(new Date());
    setShowOnlySaved(false);
  };

  // Open Google Maps with coordinates
  const openGoogleMaps = (coordinates: { lat: number, lng: number }) => {
    if (!coordinates) return;
    
    const url = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
    window.open(url, '_blank');
  };

  // Enhanced search and filtering functionality
  useEffect(() => {
    if (!mounted) return;
    
    // Start with all statements with dates
    let result = [...statementsWithDates];
    
    // Filter statements based on search, saved, and date criteria
    let filteredResult = [...statementsWithDates];
    
    // Apply search filter - search for complete strings
    if (searchTerm) {
      filteredResult = filteredResult.map(statement => ({
        ...statement,
        parties: statement.parties.filter(party => 
          searchCompleteString(party.partyCode, searchTerm) ||
          searchCompleteString(party.partyName, searchTerm) ||
          (party.contactInfo && searchCompleteString(party.contactInfo, searchTerm))
        )
      }));
    }

    // Filter saved parties if the switch is on
    if (showOnlySaved) {
      filteredResult = filteredResult.map(statement => ({
        ...statement,
        parties: statement.parties.filter(party => isPartySaved(party.partyCode))
      }));
    }

    // Filter by upload date - this filters the entire statements
    if (selectedDate) {
      // Format the selected date as DD/MM/YYYY for comparison
      const dateString = format(selectedDate, 'dd/MM/yyyy');
      
      // Filter statements based on their upload date
      result = result.filter(statement => 
        statement.uploadDate === dateString
      );
      
      // Also filter the statements used for party filtering
      filteredResult = filteredResult.filter(statement => 
        statement.uploadDate === dateString
      );
    }
    
    // Set filtered statements for the tabs
    setFilteredStatements(result);
    
    // Set filtered data for the parties list
    setFilteredData(filteredResult);
  }, [statementsWithDates, searchTerm, selectedDate, showOnlySaved, isPartySaved, mounted]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  // Save with location and timestamp
  const handleSaveWithMetadata = (partyCode: string) => {
    savePartyImage(partyCode);
    
    // Create a timestamp without hydration-sensitive locale info
    const timestamp = new Date().toISOString();
    
    // Function to save the party data with metadata
    const savePartyData = (coordinates: { lat: number, lng: number } | null) => {
      setSavedParties(prev => ({
        ...prev,
        [partyCode]: {
          timestamp,
          coordinates
        }
      }));
    };
    
    // Only execute geolocation code on the client side
    if (mounted) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coordinates = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            savePartyData(coordinates);
          },
          (error) => {
            // If location access denied, still save with timestamp but null coordinates
            savePartyData(null);
            console.error("Error getting location:", error);
          }
        );
      } else {
        // If geolocation not supported
        savePartyData(null);
      }
    } else {
      // If we're not on the client yet (during SSR), save without coordinates
      savePartyData(null);
    }
  };

  // Show image preview
  const handleImagePreview = (imageUrl: string) => {
    setImagePreviewUrl(imageUrl);
  };

  // Calculate saved count
  const calculateSavedCount = (statement: Statement) => {
    const totalParties = statement.parties.length;
    const savedCount = statement.parties.filter(party => isPartySaved(party.partyCode)).length;
    return `${savedCount}/${totalParties}`;
  };

  // Format date safely
  const formatDateSafe = (date: Date | null) => {
    if (!date) return 'Select date';
    try {
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      return 'Select date';
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  if (!mounted) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="my-2 text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daily Statements</h1>
        <div className="flex flex-col items-end">
          {uploadStatus && (
            <p className="text-sm text-blue-500 mb-2">{uploadStatus}</p>
          )}
          <div className="flex space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt"
              multiple
            />
            <Button variant="outline" onClick={handleUploadClick} disabled={isLoading}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Statements
            </Button>
            {statements.length > 0 && (
              <Button 
                onClick={clearStatements} 
                disabled={isLoading}
                variant="outline"
                className="text-red-500 hover:bg-red-50"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="my-2 text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
      ) : statements.length > 0 ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search input */}
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                  onSelect={(date: Date | undefined) => setSelectedDate(date ?? new Date())}
                  initialFocus
                />
                <div className="p-2 border-t flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
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
              <Label htmlFor="show-saved">Show Saved Only</Label>
            </div>
            
            {/* Clear All Filters button */}
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

          {filteredStatements.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="relative overflow-hidden mb-4">
                <TabsList className="overflow-x-auto flex w-full justify-start py-2 px-0 no-scrollbar" style={{ maxWidth: '100%' }}>
                  {filteredStatements.map((statement) => (
                    <TabsTrigger 
                      key={statement.id} 
                      value={statement.id}
                      className="whitespace-nowrap px-4 sm:px-6 py-2 text-sm sm:text-base font-medium flex-1 max-w-[200px] min-w-[120px] overflow-hidden text-ellipsis"
                    >
                      <div className="flex flex-col items-center">
                        <span className="truncate w-full text-center" title={statement.name}>
                          {statement.name}
                        </span>
                        <Badge variant="outline" className="mt-1">
                          {calculateSavedCount(statement)}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {filteredStatements.length > 2 && (
                  <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"></div>
                )}
              </div>

              {filteredStatements.map((statement) => (
                <TabsContent key={statement.id} value={statement.id} className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
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
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                    <div>
                      <span className="font-medium">Report Date:</span> {formatDate(statement.reportDate)}
                    </div>
                    <div>
                      <span className="font-medium">Upload Date:</span> {statement.uploadDate}
                    </div>
                  </div>

                  {filteredData.find(s => s.id === statement.id)?.parties.length ? (
                    <div className="space-y-6">
                      {filteredData.find(s => s.id === statement.id)?.parties.map((party: Party) => (
                        <Card key={party.partyCode} className="shadow-sm overflow-hidden">
                          <div 
                            className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-muted cursor-pointer"
                            onClick={() => togglePartyExpand(statement.id, party.partyCode)}
                          >
                            <div className="flex items-center mb-2 sm:mb-0">
                              {isPartyExpanded(statement.id, party.partyCode) ? (
                                <ChevronDown className="h-4 w-4 mr-2 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0" />
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {party.partyCode.startsWith('-') ? party.partyCode.substring(1).trim() : party.partyCode} {party.partyName}
                                </span>
                                {(party.contactInfo || party.creditDays) && (
                                  <span className="text-xs text-muted-foreground">
                                    {party.contactInfo && `(${party.contactInfo})`} {party.creditDays && `(Days: ${party.creditDays})`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {isPartySaved(party.partyCode) ? (
                                <div className="flex items-center text-sm">
                                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                                  <span className="text-green-600 font-medium">Saved</span>
                                  {savedParties[party.partyCode] && (
                                    <div className="flex items-center ml-2">
                                      <Badge variant="outline" className="text-xs">
                                        {formatTimestamp(savedParties[party.partyCode].timestamp)}
                                      </Badge>
                                      {savedParties[party.partyCode].coordinates && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="ml-1 p-1 h-auto"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openGoogleMaps(savedParties[party.partyCode].coordinates!);
                                          }}
                                          title="View Location"
                                        >
                                          <MapPin className="h-4 w-4 text-blue-500" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : hasPartyImage(party.partyCode) ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveWithMetadata(party.partyCode);
                                  }}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    captureStatementImage(party.partyCode);
                                  }}
                                >
                                  <Camera className="h-4 w-4 mr-1" />
                                  Capture
                                </Button>
                              )}
                              {capturedImages[party.partyCode] && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImagePreview(capturedImages[party.partyCode]);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Preview
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadPartyPDF(party, statement);
                                }}
                                disabled={isLoading || !isPartySaved(party.partyCode)}
                              >
                                <FileDown className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                            </div>
                          </div>

                          {isPartyExpanded(statement.id, party.partyCode) && (
                            <div className="p-4">
                              <div className="w-[90%] mx-auto overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[5%]">DC</TableHead>
                                      <TableHead className="w-[10%]">Voucher Date</TableHead>
                                      <TableHead className="w-[12%]">Voucher Number</TableHead>
                                      <TableHead className="w-[10%]">Debits</TableHead>
                                      <TableHead className="w-[10%]">Part Adjustment</TableHead>
                                      <TableHead className="w-[10%]">Balance</TableHead>
                                      <TableHead className="w-[10%]">Balance C/F</TableHead>
                                      <TableHead className="w-[5%]">Days</TableHead>
                                      <TableHead className="w-[28%]">Discount Narration</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {party.entries.map((entry, entryIndex) => (
                                      <TableRow key={entryIndex}>
                                        <TableCell>{entry.dc}</TableCell>
                                        <TableCell>{entry.voucherDate}</TableCell>
                                        <TableCell>{entry.voucherNumber ? `${entry.dc} ${entry.voucherNumber}` : '*'}</TableCell>
                                        <TableCell>
                                          {entry.debits.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                          {entry.partAdjustment === 0 ? '-' : entry.partAdjustment.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                          {entry.balance.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                          {entry.balanceCarryForward.toFixed(2)}
                                        </TableCell>
                                        <TableCell>{entry.days}</TableCell>
                                        <TableCell>{entry.discountNarration}</TableCell>
                                      </TableRow>
                                    ))}
                                    
                                    {party.total && (
                                      <TableRow className="bg-muted/50">
                                        <TableCell colSpan={3} className="font-medium">Total</TableCell>
                                        <TableCell className="font-medium">
                                          {party.total.debits.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {party.total.partAdjustment === 0 ? '-' : party.total.partAdjustment.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {party.total.balance.toFixed(2)}
                                        </TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="font-medium">{party.total.discountNarration}</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="shadow-sm">
                      <CardContent className="flex flex-col items-center justify-center p-8">
                        <p className="text-muted-foreground">
                          No parties match your search criteria
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <p className="text-muted-foreground">
                  {selectedDate
                    ? `No statements found for ${format(selectedDate, 'dd/MM/yyyy')}`
                    : 'No statements match your criteria'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card 
          className={cn(
            "shadow-sm border-2 transition-all", 
            isDragging ? "border-dashed border-primary" : "border-dashed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center p-16 space-y-6">
            <div className={cn(
              "p-6 rounded-full bg-muted/50 transition-all", 
              isDragging ? "bg-primary/10" : ""
            )}>
              <Upload className={cn(
                "h-12 w-12", 
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">No statement data available</h3>
              <p className="text-muted-foreground">
                {isDragging 
                  ? 'Drop your statement files here!' 
                  : 'Drag and drop your statement files here, or click the button below to browse'}
              </p>
            </div>
            <Button onClick={handleUploadClick}>
              <Upload className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Modal */}
      {imagePreviewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setImagePreviewUrl(null)}>
          <div className="bg-white p-4 rounded-lg max-w-3xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Image Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setImagePreviewUrl(null)}>
                ×
              </Button>
            </div>
            <img src={imagePreviewUrl} alt="Statement Preview" className="max-w-full max-h-[70vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
} 