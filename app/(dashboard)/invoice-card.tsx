import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Package, Truck } from "lucide-react";
import { IInvoice } from '@/store/useAnalyticsStore';
import { tweleHrFormatDateString } from "@/lib/helper";
import moment from "moment-timezone";

export const InvoiceCard = ({ invoice }: { invoice: IInvoice }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Show More</Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-auto max-w-[95vw] md:max-w-[60vw] rounded-md max-h-[80vh] overflow-x-scroll mb-5 p-5">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Invoice #{invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4 overflow-y-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Party Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Party Code:</span> {invoice.partyCode}</p>
                <p><span className="text-muted-foreground">Medical Name:</span> {invoice.party?.customerName}</p>
                <p><span className="text-muted-foreground">City:</span> {invoice.party?.city}</p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Invoice Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Generated Date:</span> {new Date(invoice.generatedDate).toLocaleDateString()}</p>
                <p><span className="text-muted-foreground">OTC:</span> {invoice.isOtc ? "Yes" : "No"}</p>
                <p><span className="text-muted-foreground">Delayed:</span> {moment(invoice.generatedDate).isSame(moment(invoice.invoiceTimestamp), 'day') ? "No" : "Yes"}</p>
              </div>
            </Card>
          </div>

          <Card className="p-6 dark:bg-gray-800">
            <h3 className="font-semibold mb-6 text-lg">Order Status Timeline</h3>
            <div className="relative w-[90%] mx-auto">
              
              <div className="absolute left-3 md:left-1/2 top-5 bottom-5 md:top-[15px] md:bottom-auto w-2 md:w-[88%] h-[calc(100%-2.5rem)] md:h-1 bg-gray-200 dark:bg-gray-600 md:-translate-x-1/2 transition-colors duration-500">
                <div 
                  className="h-full w-full md:w-full bg-green-500 rounded-full" 
                  style={{
                    height: `${window.innerWidth < 768 ? 
                      (invoice.deliveredTimestamp ? '100%' : 
                       invoice.pickupTimestamp ? '75%' :
                       invoice.packageTimestamp ? '50%' :
                       invoice.checkTimestamp ? '25%' : '0%') : '100%'}`,
                    width: `${window.innerWidth >= 768 ?
                      (invoice.deliveredTimestamp ? '100%' : 
                       invoice.pickupTimestamp ? '80%' :
                       invoice.packageTimestamp ? '55%' :
                       invoice.checkTimestamp ? '30%' : '0%') : '100%'}`
                  }}
                />
              </div>

              <div className="flex flex-col md:flex-row justify-between space-y-8 md:space-y-0">
                
                <div className="relative flex items-center md:flex-col md:items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${invoice.invoiceTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col md:items-center md:text-center">
                    <p className="font-medium text-xs">Invoiced</p>
                    {invoice.invoiceTimestamp && (
                      <div className="text-[10px] text-muted-foreground">
                        <p>{tweleHrFormatDateString(new Date(invoice.invoiceTimestamp))}</p>
                        <p className="font-medium text-primary">{invoice.invoiceUsername}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex items-center md:flex-col md:items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${invoice.checkTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col md:items-center md:text-center">
                    <p className="font-medium text-xs">Checked</p>
                    {invoice.checkTimestamp && (
                      <div className="text-[10px] text-muted-foreground">
                        <p>{tweleHrFormatDateString(new Date(invoice.checkTimestamp))}</p>
                        <p className="font-medium text-primary">{invoice.checkUsername}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex items-center md:flex-col md:items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${invoice.packageTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col md:items-center md:text-center">
                    <p className="font-medium text-xs">Packed</p>
                    {invoice.packageTimestamp && (
                      <div className="text-[10px] text-muted-foreground">
                        <p>{tweleHrFormatDateString(new Date(invoice.packageTimestamp))}</p>
                        <p className="font-medium text-primary">{invoice.packageUsername}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex items-center md:flex-col md:items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${invoice.pickupTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col md:items-center md:text-center">
                    <p className="font-medium text-xs">Picked Up</p>
                    {invoice.pickupTimestamp && (
                      <div className="text-[10px] text-muted-foreground">
                        <p>{tweleHrFormatDateString(new Date(invoice.pickupTimestamp))}</p>
                        <p className="font-medium text-primary">{invoice.pickupUsername}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex items-center md:flex-col md:items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${invoice.deliveredTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col md:items-center md:text-center">
                    <p className="font-medium text-xs">Delivered</p>
                    {invoice.deliveredTimestamp && (
                      <div className="text-[10px] text-muted-foreground">
                        <p>{tweleHrFormatDateString(new Date(invoice.deliveredTimestamp))}</p>
                        <p className="font-medium text-primary">{invoice.deliveredUsername}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              
            </div>
          </Card>

          {invoice.deliveredLocationLink && (
            <Card className="p-4 dark:bg-gray-800">
              <h3 className="font-semibold mb-2">Delivery Location</h3>
              <a href={invoice.deliveredLocationLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-2">
                <span>View Delivery Location</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </Card>
          )}
          
        </div>
      </DialogContent>
    </Dialog>
); 