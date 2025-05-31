'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Import tab components
import SalaryManagementTab from './components/salary-management-tab';
import AttendanceReportTab from './components/attendance-report-tab';
import LoansManagementTab from './components/loans-management-tab';

export default function AttendanceSalaryPage() {
  const [activeTab, setActiveTab] = useState("salary");
  
  // Set default date range to past 31 days
  const today = new Date();
  const thirtyOneDaysAgo = new Date();
  thirtyOneDaysAgo.setDate(today.getDate() - 30); // -30 to make it 31 days including today
  
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    thirtyOneDaysAgo,
    today
  ]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleRangeSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newRange: [Date, Date] = [...dateRange];
      
      if (!dateRange[0] || dateRange[1]) {
        // If no start date or both dates selected, start a new range
        newRange[0] = selectedDate;
        newRange[1] = selectedDate;
      } else {
        // If only start date selected, complete the range
        if (selectedDate < dateRange[0]) {
          newRange[0] = selectedDate;
          newRange[1] = dateRange[0];
        } else {
          newRange[1] = selectedDate;
        }
      }
      
      setDateRange(newRange);
      setDate(selectedDate);
      
      if (newRange[0] && newRange[1]) {
        setIsCalendarOpen(false);
      }
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Attendance, Salary & Loans Management</h1>
        
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal w-[280px]",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange && dateRange[0] && dateRange[1] ? (
                <>
                  {format(dateRange[0], "PPP")} - {format(dateRange[1], "PPP")}
                </>
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{
                from: dateRange[0],
                to: dateRange[1]
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange([range.from, range.to]);
                  setIsCalendarOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs defaultValue="salary" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="salary">Salary Management</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Report</TabsTrigger>
          <TabsTrigger value="loans">Loans Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="salary">
          <SalaryManagementTab dateRange={dateRange} />
        </TabsContent>
        
        <TabsContent value="attendance">
          <AttendanceReportTab dateRange={dateRange} />
        </TabsContent>
        
        <TabsContent value="loans">
          <LoansManagementTab dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 