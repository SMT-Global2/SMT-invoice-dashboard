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
  
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>([
    thirtyOneDaysAgo,
    today
  ]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
                if (range?.from) {
                  setDateRange([range.from, range.to]);
                  // Only close calendar when both dates are selected
                  if (range.to) {
                    setIsCalendarOpen(false);
                  }
                } else {
                  // Clear selection
                  setDateRange([undefined, undefined]);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Responsive Tabs/Dropdown */}
      <div className="mb-8">
        {/* Mobile: Dropdown */}
        <div className="block md:hidden mb-4">
          <select
            className="w-full rounded-md border px-3 py-2 bg-background text-foreground"
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
          >
            <option value="salary">Salary Management</option>
            <option value="attendance">Attendance Report</option>
            <option value="loans">Loans Management</option>
          </select>
        </div>
        {/* Tabs and TabsList must be together */}
        <Tabs defaultValue="salary" value={activeTab} onValueChange={setActiveTab}>
          <div className="hidden md:block">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="salary">Salary Management</TabsTrigger>
              <TabsTrigger value="attendance">Attendance Report</TabsTrigger>
              <TabsTrigger value="loans">Loans Management</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="salary">
            <SalaryManagementTab dateRange={[
              dateRange[0] ? dateRange[0] : new Date(),
              dateRange[1] ? dateRange[1] : new Date()
            ]} />
          </TabsContent>
          <TabsContent value="attendance">
            <AttendanceReportTab dateRange={[
              dateRange[0] ? dateRange[0] : new Date(),
              dateRange[1] ? dateRange[1] : new Date()
            ]} />
          </TabsContent>
          <TabsContent value="loans">
            <LoansManagementTab dateRange={[
              dateRange[0] ? dateRange[0] : new Date(),
              dateRange[1] ? dateRange[1] : new Date()
            ]} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 