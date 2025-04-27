'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Star, AlertCircle, CheckCircle, Clock, Filter, Search, Calendar as CalendarIcon, Expand, Copy, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from 'sonner';
import {
  Dialog,
  // DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShowImage } from '@/components/show-image';
import { getS3BucketUrl } from '@/lib/helper';
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

const issueTypes = [
  'Missing Product',
  'Incorrect Quantity',
  'Billing Problem',
  'Service Problem',
  'More Order',
  'Request Callback',
  'Others'
];

const statusColors = {
  PENDING: 'bg-yellow-500/10 text-yellow-500',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-500',
  RESOLVED: 'bg-green-500/10 text-green-500'
};

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: AlertCircle,
  RESOLVED: CheckCircle
};

export default function ContactFormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    issueType: 'all',
    status: 'all',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    urgent: 'all'
  });
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copied to clipboard!');
    }, (err) => {
      toast.error('Failed to copy link');
      console.error('Could not copy text: ', err);
    });
  };

  useEffect(() => {
    fetchForms();
  }, [filters]);

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (date) {
      if (type === 'start') {
        setStartDate(date);
        setFilters({
          ...filters,
          startDate: format(date, 'yyyy-MM-dd')
        });
      } else {
        setEndDate(date);
        setFilters({
          ...filters,
          endDate: format(date, 'yyyy-MM-dd')
        });
      }
    }
  };

  const fetchForms = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.issueType && filters.issueType !== 'all') {
        queryParams.append('issueType', filters.issueType);
      }
      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }
      if (filters.urgent !== 'all') {
        queryParams.append('urgent', filters.urgent);
      }
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`/api/contact-form?${queryParams.toString()}`);
      const data = await response.json();
      
      // Apply search filter on client side
      let filteredData = data;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = data.filter((form: any) => 
          form.medicalName.toLowerCase().includes(searchTerm) || 
          form.invoiceNumber.toLowerCase().includes(searchTerm)
        );
      }
      
      setForms(filteredData);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (formId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/contact-form?id=${formId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setForms(forms.map(form => 
        form.id === formId ? { ...form, status: newStatus } : form
      ));
      
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/contact-form?id=${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete form');

      setForms(forms.filter(form => form.id !== formId));
      toast.success('Form deleted successfully');
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    }
  };

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://invoice.sanjivanmedicotraders.in';

  return (
    <div className="p-6">
      <Card className="shadow-sm bg-background border-none">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Contact Forms</CardTitle>
              <CardDescription>Manage customer feedback and complaints</CardDescription>
              <div className="mt-2 flex items-center gap-2">
                <a 
                  href={`${frontendUrl}/contact-form`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {`${frontendUrl}/contact-form`}
                </a>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-1.5"
                  onClick={() => copyToClipboard(`${frontendUrl}/contact-form`)}
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </Button>
                <span className="text-xs text-muted-foreground">(Public Form Link)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {forms.length} forms found
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-sm">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by medical name or invoice number"
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setFilters({
                  search: '',
                  issueType: 'all',
                  status: 'all',
                  startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                  endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
                  urgent: 'all'
                });
                setStartDate(startOfMonth(new Date()));
                setEndDate(endOfMonth(new Date()));
              }}
            >
              Reset Filters
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Issue Type</Label>
              <Select
                value={filters.issueType}
                onValueChange={(value) => setFilters({ ...filters, issueType: value })}
              >
                <SelectTrigger className="h-9 text-left">
                  <SelectValue placeholder="All Issue Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issue Types</SelectItem>
                  {issueTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="h-9 text-left">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => handleDateChange('start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => handleDateChange('end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Urgency</Label>
              <Select
                value={filters.urgent}
                onValueChange={(value) => setFilters({ ...filters, urgent: value })}
              >
                <SelectTrigger className="h-9 text-left">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Urgent Only</SelectItem>
                  <SelectItem value="false">Non-Urgent Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading forms...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {forms.map((form) => (
                <Card key={form.id} className="overflow-hidden shadow-sm border-none bg-muted/40">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-medium">{form.medicalName}</h3>
                          <p className="text-xs text-muted-foreground">{form.city || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {form.isUrgent && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">Urgent</Badge>
                          )}
                          <Badge className={`text-xs px-1.5 py-0 ${statusColors[form.status as keyof typeof statusColors]}`}>
                            {(() => {
                              const StatusIcon = statusIcons[form.status as keyof typeof statusIcons];
                              return (
                                <div className="flex items-center gap-1">
                                  <StatusIcon className="w-3 h-3" />
                                  <span>{form.status.replace('_', ' ')}</span>
                                </div>
                              );
                            })()}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Invoice Number</p>
                          <p className="font-medium">{form.invoiceNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Issue Type</p>
                          <p className="font-medium">{form.issueType}</p>
                        </div>
                      </div>

                      {form.comments && (
                        <div className="text-sm">
                          <p className="text-xs text-muted-foreground">Comments</p>
                          <p className="line-clamp-2">{form.comments}</p>
                        </div>
                      )}

                      {form.rating > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-xs text-muted-foreground">Rating:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= form.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(form.createdAt), 'd MMM yyyy, hh:mm a')}
                        </p>
                        <div className="flex items-center gap-2">
                          {form.images.length > 0 && (
                            <ShowImage images={form.images} />
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="py-[1rem]">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the contact form.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteForm(form.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="py-[1rem]">
                                Update Status
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateStatus(form.id, 'PENDING')}>
                                Mark as Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(form.id, 'IN_PROGRESS')}>
                                Mark as In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(form.id, 'RESOLVED')}>
                                Mark as Resolved
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {forms.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No forms found matching the selected criteria
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 