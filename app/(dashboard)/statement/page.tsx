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

// Define types for our components
interface SavedPartyInfo {
  timestamp: string;
  location?: string | null;
  coordinates?: { lat: number; lng: number } | null;
}

interface HandlersProps {
  togglePartyExpand: (statementId: string, partyCode: string) => void;
  isPartyExpanded: (statementId: string, partyCode: string) => boolean;
  isPartySaved: (partyCode: string) => boolean;
  hasPartyImage: (partyCode: string) => boolean;
  capturedImages: Record<string, string>;
  savedParties: Record<string, SavedPartyInfo>;
  captureStatementImage: (partyCode: string, reportId: string) => void;
  savePartyImage: (partyCode: string, reportId: string) => void;
  downloadPartyPDF: (party: Report, statement: Statement) => void;
  isLoading: boolean;
}

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  buttonText?: string;
  buttonAction?: () => void;
  showUpload?: boolean;
  handleFileUpload?: (file: File) => void;
  isUploading?: boolean;
}

interface PartyRowProps {
  party: Report;
  statement: Statement;
  handlers: HandlersProps;
}

interface PartyActionsProps {
  party: Report;
  statement: Statement;
  handlers: HandlersProps;
}

interface PartyDetailsProps {
  party: Report;
}

interface PartyEntry {
  dc: string;
  voucherDate: string;
  voucherNumber?: string;
  debits: number;
  partAdjustment: number;
  balance: number;
  balanceCarryForward: number;
  days: number;
  discountNarration: string;
}

// Mock S3 upload function - in reality, this would use AWS SDK or similar
const uploadToS3 = async (file: File): Promise<string> => {
  // This is a mock function - in a real app, you would use AWS SDK
  console.log('Uploading file to S3:', file.name);
  
  // Simulate a delay for uploading
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return a mock S3 URL
  return `https://your-s3-bucket.s3.amazonaws.com/${file.name}`;
};

// Reusable components
const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  message, 
  buttonText, 
  buttonAction,
  showUpload,
  handleFileUpload,
  isUploading
}) => (
  <Card className="shadow-sm">
    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <div className="text-muted-foreground">{message}</div>
      
      {showUpload && (
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  <span>Upload Statement</span>
                </>
              )}
            </div>
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              accept=".txt,.csv,.xls,.xlsx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && handleFileUpload && !isUploading) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              disabled={isUploading}
            />
          </label>
        </div>
      )}
      
      {buttonText && buttonAction && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={buttonAction}
          className="mt-2"
        >
          {buttonText}
        </Button>
      )}
    </CardContent>
  </Card>
);

const PartyRow: React.FC<PartyRowProps> = ({ party, statement, handlers }) => {
  const { 
    togglePartyExpand, 
    isPartyExpanded, 
    isPartySaved,
    hasPartyImage,
    capturedImages,
    savedParties,
    downloadPartyPDF,
  } = handlers;

  return (
    <Card className="shadow-sm overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary transition-colors">
      <div 
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-muted/40 cursor-pointer"
        onClick={() => togglePartyExpand(statement.id, party.partyCode)}
      >
        <div className="flex items-center mb-2 sm:mb-0">
          {isPartyExpanded(statement.id, party.partyCode) ? (
            <ChevronDown className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
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
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
          <PartyActions 
            party={party} 
            statement={statement} 
            handlers={handlers} 
          />
        </div>
      </div>

      {isPartyExpanded(statement.id, party.partyCode) && (
        <PartyDetails party={party} />
      )}
    </Card>
  );
};

const PartyActions: React.FC<PartyActionsProps> = ({ party, statement, handlers }) => {
  const { 
    isPartySaved, 
    hasPartyImage, 
    capturedImages, 
    savedParties,
    captureStatementImage,
    savePartyImage,
    downloadPartyPDF,
    isLoading,
  } = handlers;

  const findReportIdForParty = (statement: Statement, partyCode: string): string => {
    return `${statement.id}_${partyCode}`;
  };

  const handleSaveWithMetadata = (partyCode: string, statement: Statement): void => {
    const reportId = findReportIdForParty(statement, partyCode);
    if (reportId) {
      savePartyImage(partyCode, reportId);
    }
  };

  const openGoogleMaps = (coordinates: { lat: number; lng: number } | null | undefined): void => {
    if (!coordinates) return;
    const url = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
    window.open(url, '_blank');
  };

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return format(date, 'dd/MM/yyyy hh:mm a');
    } catch {
      return isoString;
    }
  };

  return (
    <>
      {isPartySaved(party.partyCode) ? (
        <div className="flex items-center gap-2">
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Saved</span>
          </Badge>
          {savedParties[party.partyCode] && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimestamp(savedParties[party.partyCode].timestamp)}
              </Badge>
              {savedParties[party.partyCode].coordinates && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleMaps(savedParties[party.partyCode].coordinates);
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
            handleSaveWithMetadata(party.partyCode, statement);
          }}
          className="bg-primary/5 border-primary/20 hover:bg-primary/10"
        >
          <Save className="h-4 w-4 mr-1 text-primary" />
          Save
        </Button>
      ) : (
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            const reportId = findReportIdForParty(statement, party.partyCode);
            if (reportId) {
              captureStatementImage(party.partyCode, reportId);
            }
          }}
        >
          <Camera className="h-4 w-4 mr-1" />
          Capture
        </Button>
      )}
      {capturedImages[party.partyCode] && (
        <ShowImage
          images={[capturedImages[party.partyCode]]}
          text="View Image"
        />
      )}
      <Button 
        variant="outline" 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          downloadPartyPDF(party, statement);
        }}
        disabled={isLoading || !isPartySaved(party.partyCode)}
        className={isPartySaved(party.partyCode) ? "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-800" : ""}
      >
        <FileDown className={`h-4 w-4 mr-1 ${isPartySaved(party.partyCode) ? "text-blue-600 dark:text-blue-400" : ""}`} />
        PDF
      </Button>
    </>
  );
};


const PartyDetails: React.FC<PartyDetailsProps> = ({ party }) => (
  <div className="p-4">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[5%]">DC</TableHead>
            <TableHead className="w-[10%]">Date</TableHead>
            <TableHead className="w-[12%]">Voucher</TableHead>
            <TableHead className="w-[10%] text-right">Debits</TableHead>
            <TableHead className="w-[10%] text-right">Part Adj.</TableHead>
            <TableHead className="w-[10%] text-right">Balance</TableHead>
            <TableHead className="w-[10%] text-right">Balance C/F</TableHead>
            <TableHead className="w-[5%]">Days</TableHead>
            <TableHead className="w-[28%]">Discount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {party.entries.map((entry, index) => (
            <TableRow key={index} className={index % 2 === 0 ? "" : "bg-muted/30"}>
              <TableCell>{entry.dc}</TableCell>
              <TableCell>{entry.voucherDate}</TableCell>
              <TableCell>{entry.voucherNumber ? `${entry.dc} ${entry.voucherNumber}` : '*'}</TableCell>
              <TableCell className="font-mono text-right">
                {entry.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-mono text-right">
                {entry.partAdjustment === 0 ? '-' : entry.partAdjustment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-mono text-right">
                {entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-mono text-right">
                {entry.balanceCarryForward.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>{entry.days}</TableCell>
              <TableCell className="text-xs">{entry.discountNarration}</TableCell>
            </TableRow>
          ))}
          
          {party.total && (
            <TableRow className="bg-accent/50 font-semibold">
              <TableCell colSpan={3} className="font-medium">Total</TableCell>
              <TableCell className="font-medium font-mono text-right">
                {party.total.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-medium font-mono text-right">
                {party.total.partAdjustment === 0 ? '-' : party.total.partAdjustment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-medium font-mono text-right">
                {party.total.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
);

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
      
      // Step 2: Upload the file to S3
      const fileUrl = await uploadToS3(file);
      
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
        fileUrl,
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
      {statements.length > 0 && (
        <Button 
          onClick={clearStatements} 
          disabled={isLoading || isUploading}
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
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

  console.log({statements})

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
                      {statements.find(s => s.id === statement.id)?.reports.length ? (
                        <div className="space-y-4">
                          {statements.find(s => s.id === statement.id)?.reports.map((party: Report , index: number) => (
                            <PartyRow 
                              key={index}
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