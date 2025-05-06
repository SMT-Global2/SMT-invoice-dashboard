"use client"

import { useEffect, useState } from "react"
import { useBackupStore, BackupSection } from "@/store/useBackupStore"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Database,
  Download,
  FileArchive,
  FileBox,
  Filter,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  File,
  Loader2,
  RefreshCw,
  AlertCircle,
  HardDrive,
  FileCheck,
  ReceiptText,
  Package,
  FileText,
  Building2,
  Truck,
  Users,
  BarChart4,
  Users2,
  StopCircle,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { format, addDays } from "date-fns"

// Helper function to replace formatDistanceToNow
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
}

// Define the backup section options with icons and descriptions
const backupSections = [
  {
    id: 'all',
    label: 'All Sections',
    description: 'Backup all data across all sections',
    icon: Database,
  },
  {
    id: 'invoice',
    label: 'Invoice Management',
    description: 'Invoices, checking, packing, delivery, and billing data',
    icon: FileCheck,
  },
  {
    id: 'receipt',
    label: 'Receipt Management',
    description: 'All receipt-related data',
    icon: ReceiptText,
  },
  {
    id: 'inventory',
    label: 'Inventory Management',
    description: 'Inventory records and vouchers',
    icon: Package,
  },
  {
    id: 'deliveryMemo',
    label: 'Delivery Memo',
    description: 'All delivery memo data',
    icon: FileText,
  },
  {
    id: 'expiry',
    label: 'Expiry',
    description: 'Expiry records and credit notes',
    icon: Calendar,
  },
  {
    id: 'agency',
    label: 'Agency',
    description: 'Agency codes and related data',
    icon: Building2,
  },
  {
    id: 'party',
    label: 'Parties/Clients',
    description: 'Client information and related data',
    icon: Users2,
  },
  {
    id: 'transportation',
    label: 'Transportation',
    description: 'Transportation records',
    icon: Truck,
  },
] as const;

// Format bytes to readable size
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format seconds to readable time
function formatTime(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes > 1 ? 's' : ''}${remainingSeconds > 0 ? ` ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}` : ''}`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  return `${hours} hour${hours > 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : ''}`;
}

export default function BackupPage() {
  const { data: session } = useSession();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  
  const {
    backupHistory,
    currentBackup,
    selectedSections,
    dateRange,
    compressionType,
    isLoading,
    error,
    
    fetchBackupHistory,
    createBackup,
    downloadBackup,
    deleteBackup,
    setSelectedSections,
    setDateRange,
    setCompressionType,
    cancelBackup,
  } = useBackupStore();
  
  // Load backup history on mount
  useEffect(() => {
    fetchBackupHistory();
  }, [fetchBackupHistory]);
  
  // Handle section selection (toggle or select just one)
  const handleSectionToggle = (sectionId: BackupSection, isAllToggle = false) => {
    const currentSections = selectedSections;
    let newSections: BackupSection[];

    if (sectionId === 'all') {
      // If 'all' is clicked, either select only 'all' or clear selection
      newSections = currentSections.includes('all') ? [] : ['all'];
    } else {
      // If another section is clicked
      if (currentSections.includes('all')) {
        // If 'all' was selected, start fresh with the clicked section
        newSections = [sectionId];
      } else {
        // Otherwise, toggle the clicked section
        if (currentSections.includes(sectionId)) {
          newSections = currentSections.filter(s => s !== sectionId);
        } else {
          newSections = [...currentSections, sectionId];
        }
      }
    }
    
    // Update the state
    setSelectedSections(newSections);
  };
  
  // Handle create backup button click
  const handleCreateBackup = () => {
    if (!dateRange?.from || !dateRange?.to) {
      return; // Date range is required
    }
    
    createBackup({
      sections: selectedSections,
      dateRange,
      compressionType
    });
  };
  
  // Handle backup deletion
  const handleDeleteBackup = (id: string) => {
    setBackupToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteBackup = async () => {
    if (backupToDelete) {
      await deleteBackup(backupToDelete);
      setBackupToDelete(null);
    }
    setDeleteDialogOpen(false);
  };
  
  // Helper to check if create button should be disabled
  const isCreateButtonDisabled = () => {
    return (
      isLoading ||
      selectedSections.length === 0 ||
      !dateRange?.from ||
      !dateRange?.to ||
      ['preparing', 'processing', 'compressing', 'finalizing'].includes(currentBackup.status)
    );
  };
  
  // Render badge for backup status
  const renderStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    let icon = null;
    
    switch (status) {
      case 'complete':
        variant = "default";
        icon = <CheckCircle className="h-3 w-3 mr-1" />;
        break;
      case 'error':
        variant = "destructive";
        icon = <XCircle className="h-3 w-3 mr-1" />;
        break;
      case 'processing':
      case 'preparing':
      case 'compressing':
      case 'finalizing':
        variant = "secondary";
        icon = <Loader2 className="h-3 w-3 mr-1 animate-spin" />;
        break;
      default:
        variant = "outline";
        icon = <Clock className="h-3 w-3 mr-1" />;
    }
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  // Custom date picker component with proper styling
  const BackupDatePicker = () => {
    return (
      <div className="grid gap-2">
        <DatePickerWithRange
          date={dateRange}
          setDate={setDateRange as React.Dispatch<React.SetStateAction<DateRange | undefined>>}
        />
      </div>
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">System Backup</h1>
          <p className="text-muted-foreground">Create and manage system backups for data protection</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger value="create" className="relative px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Backup</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="history" className="relative px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">
                <div className="flex items-center gap-2">
                  <FileBox className="h-4 w-4" />
                  <span>Backup History</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="create">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Left Column - Configuration Cards */}
              <div className="xl:col-span-3 space-y-6">
                {/* Date Range Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle>Date Range</CardTitle>
                    </div>
                    <CardDescription>
                      Select the time period to back up data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <BackupDatePicker />
                  </CardContent>
                </Card>
                
                {/* Sections Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      <CardTitle>Backup Sections</CardTitle>
                    </div>
                    <CardDescription>
                      Choose which data to include in your backup
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {backupSections.map((section) => {
                        const isSelected = selectedSections.includes(section.id as BackupSection);
                        const isAllSelected = selectedSections.includes('all');
                        const isDisabled = isAllSelected && section.id !== 'all';
                        
                        return (
                          <div
                            key={section.id}
                            onClick={() => !isDisabled && handleSectionToggle(section.id as BackupSection, section.id === 'all')}
                            className={`
                              relative rounded-lg border p-4 
                              transition-all duration-200 ease-in-out
                              ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}
                              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
                            `}
                          >
                            {isSelected && (
                              <div className="absolute top-3 right-3">
                                <CheckCircle className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-full bg-primary/10">
                                  <section.icon className="h-4 w-4 text-primary" />
                                </div>
                                <h3 className="font-medium text-sm">{section.label}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">{section.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Compression Type Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center gap-2">
                      <FileArchive className="h-5 w-5 text-primary" />
                      <CardTitle>Compression Options</CardTitle>
                    </div>
                    <CardDescription>
                      Choose the file format for your backup
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div 
                        className={`
                          p-4 border rounded-lg flex items-center gap-3 cursor-pointer transition-all
                          ${compressionType === 'zip' ? 'border-primary bg-primary/5' : 'hover:border-primary/50 hover:bg-muted/30'}
                        `}
                        onClick={() => setCompressionType('zip')}
                      >
                        <div className="p-2 rounded-full bg-blue-100 text-blue-700">
                          <FileArchive className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium">ZIP Archive</h3>
                          <p className="text-xs text-muted-foreground">Common format, wide compatibility</p>
                        </div>
                        {compressionType === 'zip' && (
                          <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </div>
                      
                      <div 
                        className={`
                          p-4 border rounded-lg flex items-center gap-3 cursor-pointer transition-all
                          ${compressionType === 'targz' ? 'border-primary bg-primary/5' : 'hover:border-primary/50 hover:bg-muted/30'}
                        `}
                        onClick={() => setCompressionType('targz')}
                      >
                        <div className="p-2 rounded-full bg-green-100 text-green-700">
                          <FileArchive className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium">TAR.GZ Archive</h3>
                          <p className="text-xs text-muted-foreground">Better compression ratio</p>
                        </div>
                        {compressionType === 'targz' && (
                          <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/20 border-t mt-3 py-4">
                    <div className="w-full flex items-center justify-end gap-4">
                      <Button variant="outline" onClick={() => fetchBackupHistory()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button 
                        onClick={handleCreateBackup} 
                        disabled={isCreateButtonDisabled()}
                        className="px-6"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Create Backup
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
              
              {/* Right Column - Status Card */}
              <div className="xl:col-span-1 space-y-6">
                <Card className="sticky top-4 overflow-hidden">
                  <CardHeader className={`pb-4 ${currentBackup.status !== 'idle' ? 'bg-primary text-primary-foreground' : 'bg-muted/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5" />
                        <CardTitle>Backup Status</CardTitle>
                      </div>
                      {currentBackup.status !== 'idle' && (
                        <div className="animate-pulse">
                          <Badge variant="outline" className="border-primary-foreground/20 text-primary-foreground">
                            Active
                          </Badge>
                        </div>
                      )}
                    </div>
                    {currentBackup.status !== 'idle' && (
                      <CardDescription className="text-primary-foreground/80">
                        Backup operation in progress
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className={`pt-6 pb-0 ${currentBackup.status !== 'idle' ? 'flex flex-col gap-4' : ''}`}>
                    {currentBackup.status === 'idle' ? (
                      <div className="flex flex-col items-center justify-center text-center py-8">
                        <div className="rounded-full bg-muted/50 p-3 mb-4">
                          <Database className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-medium mb-1">No Active Backup</h3>
                        <p className="text-sm text-muted-foreground">
                          Configure and start a backup using the options
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress:</span>
                            <span className="font-medium">{currentBackup.progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={currentBackup.progress} className="h-2" />
                        </div>
                        
                        <div className="space-y-3 bg-muted/20 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <span className="text-sm font-medium capitalize">{currentBackup.status}</span>
                          </div>
                          
                          {currentBackup.section && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Processing:</span>
                              <span className="text-sm font-medium">
                                {backupSections.find(s => s.id === currentBackup.section)?.label || currentBackup.section}
                              </span>
                            </div>
                          )}
                          
                          {currentBackup.estimatedTimeRemaining !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Time left:</span>
                              <span className="text-sm font-medium">{formatTime(currentBackup.estimatedTimeRemaining)}</span>
                            </div>
                          )}
                          
                          {currentBackup.currentSize !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Current size:</span>
                              <span className="text-sm font-medium">{formatBytes(currentBackup.currentSize)}</span>
                            </div>
                          )}
                          
                          {currentBackup.startTime && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Started:</span>
                              <span className="text-sm font-medium">{formatTimeAgo(new Date(currentBackup.startTime))}</span>
                            </div>
                          )}
                        </div>
                        
                        {currentBackup.message && (
                          <div className="text-sm bg-muted/30 p-3 rounded-lg border border-muted">
                            <div className="font-medium mb-1">Status Message:</div>
                            <div className="text-muted-foreground">{currentBackup.message}</div>
                          </div>
                        )}
                        
                        {currentBackup.error && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{currentBackup.error}</AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </CardContent>
                  
                  {currentBackup.status !== 'idle' && (
                    <CardFooter className="pt-4 pb-6">
                      {currentBackup.status === 'COMPLETED' && currentBackup.id && (
                        <Button 
                          variant="default" 
                          className="w-full"
                          onClick={() => downloadBackup(currentBackup.id!)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Backup
                        </Button>
                      )}
                      
                      {['preparing', 'processing', 'compressing', 'finalizing'].includes(currentBackup.status) && (
                        <Button 
                          variant="outline" 
                          className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => cancelBackup()}
                        >
                          <StopCircle className="h-4 w-4 mr-2" />
                          Cancel Backup
                        </Button>
                      )}
                    </CardFooter>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <div className="space-y-6">
              <Card className="overflow-hidden shadow-sm border-muted/60">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileBox className="h-5 w-5 text-primary" />
                      <CardTitle>Backup History</CardTitle>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={() => fetchBackupHistory()}
                      className="h-8 gap-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh</span>
                    </Button>
                  </div>
                  <CardDescription>
                    View and manage previously created backups
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-6 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : backupHistory.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                        <FileArchive className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mt-6 text-lg font-medium">No Backups Available</h3>
                      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                        You haven't created any backups yet. Create your first backup to keep your data safe.
                      </p>
                      <Button 
                        variant="default" 
                        className="mt-6"
                        onClick={() => setActiveTab("create")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Backup
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="font-medium">Backup File</TableHead>
                            <TableHead className="font-medium">Created</TableHead>
                            <TableHead className="font-medium">Sections</TableHead>
                            <TableHead className="font-medium">Size</TableHead>
                            <TableHead className="font-medium">Files</TableHead>
                            <TableHead className="font-medium">Created By</TableHead>
                            <TableHead className="text-right font-medium">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {backupHistory.map((backup) => (
                            <TableRow key={backup.id} className="hover:bg-muted/15">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {backup.filename.endsWith('.zip') ? (
                                    <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                                      <FileArchive className="h-4 w-4" />
                                    </div>
                                  ) : (
                                    <div className="p-1.5 bg-green-50 rounded-md text-green-600">
                                      <FileArchive className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div className="font-medium truncate max-w-[200px]">
                                    {backup.filename}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{format(new Date(backup.createdAt), 'MMM d, yyyy')}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(backup.createdAt), 'h:mm a')}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                  {backup.sections.map((section) => {
                                    const sectionInfo = backupSections.find(s => s.id === section);
                                    if (!sectionInfo) return null;
                                    
                                    return (
                                      <Badge key={section} variant="secondary" className="text-xs">
                                        {section === 'all' ? 'All' : sectionInfo.id}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{formatBytes(backup.size)}</TableCell>
                              <TableCell>{backup.fileCount.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    {backup.createdBy.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{backup.createdBy}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadBackup(backup.id)}
                                    className="h-8 px-2"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteBackup(backup.id)}
                                    className="h-8 px-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Backup Information */}
              {backupHistory.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-primary" />
                      <CardTitle>Backup Information</CardTitle>
                    </div>
                    <CardDescription>
                      Detailed information about what is included in the backups
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <Accordion type="single" collapsible className="w-full">
                      {backupSections.map((section) => (
                        <AccordionItem 
                          key={section.id} 
                          value={section.id}
                          className="border-b border-muted/60 last:border-b-0"
                        >
                          <AccordionTrigger className="py-4 hover:no-underline">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                <section.icon className="h-4 w-4" />
                              </div>
                              <span className="font-medium">{section.label}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-6">
                            <div className="space-y-4 pl-10">
                              <p className="text-sm text-muted-foreground">
                                {section.description}
                              </p>
                              <div>
                                <h4 className="text-sm font-medium mb-2">Includes:</h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                  {section.id === 'all' ? (
                                    <li className="flex items-center gap-2">
                                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                      <span>All data from all sections</span>
                                    </li>
                                  ) : section.id === 'invoice' ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Invoice records with full details</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Checking, packing, and delivery status</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Billing information</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>User tracking and timestamps</span>
                                      </li>
                                    </>
                                  ) : section.id === 'receipt' ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Receipt records and numbers</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Payment methods and amounts</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Cash and cheque details</span>
                                      </li>
                                    </>
                                  ) : section.id === 'inventory' ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Inventory items and records</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Voucher information</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Agency-related inventory data</span>
                                      </li>
                                    </>
                                  ) : section.id === 'deliveryMemo' ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Delivery memo records</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Collection and checking status</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Associated images</span>
                                      </li>
                                    </>
                                  ) : section.id === 'expiry' ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Expiry records and dates</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Credit note information</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Associated images</span>
                                      </li>
                                    </>
                                  ) : section.id === 'agency' ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Agency code records</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Company names and information</span>
                                      </li>
                                    </>
                                  ) : section.id === 'party' ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Party/client records</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Location and contact information</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Regional codes</span>
                                      </li>
                                    </>
                                  ) : section.id === 'transportation' ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Transportation records</span>
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span>Company and contact information</span>
                                      </li>
                                    </>
                                  ) : null}
                                </ul>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              backup file and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteBackup}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 