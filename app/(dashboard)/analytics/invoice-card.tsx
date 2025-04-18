import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Maximize2, Package, Truck, DollarSign } from "lucide-react";
// Make sure you have this import for cn utility
import { cn } from "@/lib/utils";
import { IInvoice } from '@/store/useAnalyticsStore'; // Assuming this type is defined elsewhere
import { tweleHrFormatDateString } from "@/lib/helper";
import moment from "moment-timezone";
import { ShowImage } from "@/components/show-image";
import React from "react"; // Import React for CSSProperties type
import { format } from "date-fns"

// Helper function to define steps and calculate progress
const getTimelineProgress = (invoice: IInvoice) => {
  // Define the sequence of steps
  const steps = [
    { key: 'invoice', timestampKey: 'invoiceTimestamp', usernameKey: 'invoiceUsername', label: 'Invoiced', icon: FileText },
    { key: 'check', timestampKey: 'checkTimestamp', usernameKey: 'checkUsername', label: 'Checked', icon: CheckCircle },
    { key: 'package', timestampKey: 'packageTimestamp', usernameKey: 'packageUsername', label: 'Packed', icon: Package },
    { key: 'pickup', timestampKey: 'pickupTimestamp', usernameKey: 'pickupUsername', label: 'Picked Up', icon: Truck },
    { key: 'delivered', timestampKey: 'deliveredTimestamp', usernameKey: 'deliveredUsername', label: 'Delivered', icon: CheckCircle },
    { key: 'billed', timestampKey: 'billedTimestamp', usernameKey: 'billedUsername', label: 'Billed', icon: DollarSign },
  ];

  // Find the index of the last step that has a valid timestamp
  let lastCompletedIndex = -1;
  steps.forEach((step, index) => {
    // Use type assertion for dynamic key access, ensure the keys exist in IInvoice
    if (invoice[step.timestampKey as keyof IInvoice]) {
      lastCompletedIndex = index;
    }
  });

  const totalSteps = steps.length;
  // Calculate progress percentage: (number of completed steps / total steps) * 100
  // Note: (lastCompletedIndex + 1) gives the count of completed steps (0 index -> 1 step)
  const progressPercent = totalSteps > 0 ? ((lastCompletedIndex + 1) / totalSteps) * 100 : 0;

  // console.log(`DEBUG: Last completed index: ${lastCompletedIndex}, Progress: ${progressPercent}%`); // Uncomment for debugging

  return { steps, lastCompletedIndex, progressPercent };
};


export const InvoiceCard = ({ invoice }: { invoice: IInvoice }) => {
  // Get the timeline steps configuration and progress calculation
  const { steps, lastCompletedIndex, progressPercent } = getTimelineProgress(invoice);

  // Prepare the style object for the progress fill element
  // This sets the CSS variable that Tailwind classes will use
  const progressFillStyle = {
    '--progress-percent': `${progressPercent}%`,
  } as React.CSSProperties; // Assert type for custom CSS properties

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Maximize2 className="h-4 w-4 mr-2" />
          Expand
        </Button>
      </DialogTrigger>
      {/* Dialog Content styling for responsiveness and scroll */}
      <DialogContent className="overflow-y-auto max-w-[95%] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] rounded-md max-h-[90vh] overflow-x-hidden mb-5 p-3 md:p-5">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">Invoice #{invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 pt-2 sm:pt-4 overflow-hidden">
          {/* Party & Invoice Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Party Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Party Code:</span> {invoice.partyCode || 'N/A'}</p>
                <p><span className="text-muted-foreground">Medical Name:</span> {invoice.party?.customerName || 'N/A'}</p>
                <p><span className="text-muted-foreground">City:</span> {invoice.party?.city || 'N/A'}</p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Invoice Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Generated:</span> {invoice.generatedDate ? format(new Date(invoice.generatedDate), 'd MMM yyyy') : 'N/A'}</p>
                <p><span className="text-muted-foreground">OTC:</span> {invoice.isOtc ? "Yes" : "No"}</p>
                {/* Provide default for comparison if invoiceTimestamp is missing */}
                <p><span className="text-muted-foreground">Delayed:</span> {moment(invoice.generatedDate).isSame(moment(invoice.invoiceTimestamp || invoice.generatedDate), 'day') ? "No" : "Yes"}</p>
                {invoice.image && invoice.image.length > 0 && (
                  <div className="pt-2">
                    <ShowImage images={invoice.image} text="View Invoice Images"/>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Timeline Card */}
          <Card className="p-4 py-6 md:p-6 dark:bg-gray-800 overflow-hidden">
            <h3 className="font-semibold mb-8 text-base md:text-lg">Order Status Timeline</h3>
            {/* Relative container for absolute positioned progress bar elements */}
            {/* Add padding bottom on mobile to ensure space below last item */}
            <div className="relative w-full pb-4 md:pb-0">
              {/* Progress Track (Background Line) */}
              {/* Uses absolute positioning, changes orientation based on screen size */}
              <div
                className={cn(
                  "absolute top-0 left-[15px] bottom-0 w-[2px]", // Mobile: Vertical line, positioned slightly left of center of icon (w-8 => 32px / 2 = 16px, minus half line width 1px = 15px)
                  "md:left-0 md:right-0 md:top-[15px] md:bottom-auto md:h-[2px] md:w-full", // Desktop: Horizontal line, positioned near icon vertical center
                  "bg-gray-200 dark:bg-gray-700 rounded-full" // Common styling
                )}
                // Nudge track slightly behind icons for clean overlap
                style={{ zIndex: 0 }}
              />

              {/* Progress Fill (Green Line) */}
              {/* Uses the same positioning as the track */}
              {/* Uses CSS variable set in `progressFillStyle` for dynamic height/width */}
              <div
                style={progressFillStyle} // Apply the CSS variable `--progress-percent`
                className={cn(
                  "absolute top-0 left-[15px] w-[2px]", // Mobile: Vertical fill positioning
                  "h-[var(--progress-percent)]",        // Mobile: Height controlled by variable
                  "md:top-[15px] md:left-0 md:h-[2px]",  // Desktop: Reset height, horizontal positioning
                  "md:w-[var(--progress-percent)]",     // Desktop: Width controlled by variable
                  "bg-green-500 rounded-full transition-all duration-700 ease-out", // Styling & Animation
                   progressPercent > 0 ? 'opacity-100' : 'opacity-0' // Hide if no progress
                )}
                 // Nudge fill slightly behind icons but above track
                // style={{ ...progressFillStyle, zIndex: 1 }}
              />

              {/* Timeline Steps Container */}
              {/* Uses Flexbox, changes direction, ensures steps are above lines (z-10) */}
              <div className="relative z-10 flex flex-col md:flex-row md:justify-between space-y-10 md:space-y-0 md:items-start">
                {steps.map((step, index) => {
                  const isCompleted = index <= lastCompletedIndex;
                  const Icon = step.icon;
                  // Safely access timestamp and username, provide defaults if needed
                  const timestamp = invoice[step.timestampKey as keyof IInvoice] as string | number | Date | undefined | null;
                  const username = invoice[step.usernameKey as keyof IInvoice] as string | undefined | null;

                  return (
                    // Each Step Item
                    <div
                      key={step.key}
                      // Mobile: Standard flex item. Desktop: Use flex-1 for distribution, but basis-0 prevents growing beyond content unless needed. Max-width for large screens.
                      className="flex items-center md:flex-col md:flex-1 md:basis-auto md:items-center md:text-center md:max-w-[15%]"
                      // Relative positioning to ensure icon/text are clickable/hoverable over progress lines
                      style={{ zIndex: 2 }}
                    >
                      {/* Icon Circle */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2", // Base style + border
                        "mr-4 md:mr-0 md:mb-3", // Spacing adjustment for mobile/desktop
                        isCompleted
                          ? 'bg-green-500 border-green-600 text-white dark:border-green-400' // Completed state style
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500', // Pending state style
                        "transition-colors duration-300" // Smooth transition for color changes
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Text Details */}
                      <div className="flex flex-col items-start md:items-center min-w-0"> {/* Allow text wrapping */}
                        <p className="font-medium text-sm whitespace-nowrap">{step.label}</p>
                        {/* Show timestamp/username only if the step is completed */}
                        {isCompleted && timestamp && (
                          <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                            <p className="whitespace-nowrap">{tweleHrFormatDateString(new Date(timestamp))}</p>
                            {username && (
                              <p className="font-semibold text-primary text-xs whitespace-nowrap truncate max-w-[100px] md:max-w-full" title={username}>{username}</p>
                            )}
                          </div>
                        )}
                        {/* Placeholder for steps not yet completed (optional) */}
                         {!isCompleted && (
                           <div className="text-[11px] text-transparent mt-1 space-y-0.5 select-none">
                             <p>--:-- --</p>
                             <p className="font-semibold text-xs">-------</p>
                           </div>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Delivery Location Card (Conditional) */}
          {invoice.deliveredLocationLink && (
            <Card className="p-4 dark:bg-gray-800">
              <h3 className="font-semibold mb-2">Delivery Location</h3>
              <a href={`https://www.google.com/maps?q=${invoice.deliveredLocationLink.replace(',', '+')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 text-sm">
                <span>View on Map</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.19a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                </svg>
              </a>
            </Card>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
