import moment from "moment-timezone";
import { DeliveryInvoiceData } from "@/store/useDeliveryInvoiceStore";
import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
// Assuming you might still want toast notifications on error
// import { toast } from "@/components/ui/use-toast";

interface ToDeliverPrintContentProps {
    toDeliverInvoices: DeliveryInvoiceData[]; // Re-added based on potential usage, adjust if not needed
    toDeliverSelectedDate: Date | undefined;
    toDeliverSearchTerm: string;
    toDeliverSelectedRegionalCodes: string[];
}

type FetchToDeliverInvoicesForPrintingProps = {
  toDeliverSelectedDate: Date | undefined;
  toDeliverSearchTerm: string;
  toDeliverSelectedRegionalCodes: string[];
}

// fetchToDeliverInvoicesForPrinting remains the same as in your original code
export const fetchToDeliverInvoicesForPrinting = async ({
  toDeliverSelectedDate,
  toDeliverSearchTerm,
  toDeliverSelectedRegionalCodes
} : FetchToDeliverInvoicesForPrintingProps) : Promise<DeliveryInvoiceData[]> => {
  try {
    const fetchInvoicesForPrinting = async () => {
      const url = new URL('/api/invoice/deliver/to-deliver', window.location.origin);

      if (toDeliverSelectedDate) {
        url.searchParams.set('date', moment(toDeliverSelectedDate).format('YYYY-MM-DD'));
      }

      // Add pagination parameters
      url.searchParams.set('page', '1');
      url.searchParams.set('limit', '1000000'); // Fetch all for printing

      // Add search parameter
      if (toDeliverSearchTerm) {
        url.searchParams.set('search', toDeliverSearchTerm);
      }

      // Add regional code filter parameters
      if (toDeliverSelectedRegionalCodes.length > 0) {
        url.searchParams.set('regionalCodes', JSON.stringify(toDeliverSelectedRegionalCodes));
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData = await response.json();
      const data = responseData.data; // Assuming structure is { data: [...], totalPages: ... }

       if (!Array.isArray(data)) {
        console.error("API did not return an array in the 'data' field:", responseData);
        throw new Error("Invalid data format received from API.");
      }


      const proccesedData = data.map((item: any) => ({
        ...item,
        medicalName: item?.party?.customerName || '-',
        city: item?.party?.city || '-',
        regionalCode: item?.party?.regionalCode || '-',
         // Ensure necessary fields exist for sorting and display
        invoiceNumber: item.invoiceNumber ?? 0,
        generatedDate: item.generatedDate ?? new Date(0).toISOString(),
        partyCode: item.partyCode ?? '-',
        paymodeMode: item.paymodeMode ?? '-',
      }));

      //Sort Data first regional code and then city and then invoice number
      proccesedData.sort((a: any, b: any) => {
        const regionalCompare = (a.regionalCode || '').localeCompare(b.regionalCode || '');
        if (regionalCompare !== 0) return regionalCompare;

        const cityCompare = (a.city || '').localeCompare(b.city || '');
        if (cityCompare !== 0) return cityCompare;

        // Assuming invoiceNumber is numeric; adjust if it's a string
        return (a.invoiceNumber || 0) - (b.invoiceNumber || 0);
      });

      return proccesedData;
    };

    return await fetchInvoicesForPrinting();
  } catch (error) {
    console.error("Error fetching invoices for printing:", error);
    // Consider adding user feedback here, e.g., using toast
    // toast({ variant: 'destructive', title: 'Error Fetching Data', description: 'Could not load invoices for printing.' });
    throw error; // Re-throw so the caller knows an error occurred
  }
};


export const toDeliverPrintContent = async ({
    // Pass fetched data directly or fetch inside if preferred
    // toDeliverInvoices, // Option 1: Pass pre-fetched data
    toDeliverSelectedDate,
    toDeliverSearchTerm,
    toDeliverSelectedRegionalCodes
}: Omit<ToDeliverPrintContentProps, 'toDeliverInvoices'>) => { // Adjust props if fetching inside

    // --- Option 2: Fetch data inside this function (as originally shown) ---
    let toDeliverInvoices: DeliveryInvoiceData[] = [];
    try {
         toDeliverInvoices = await fetchToDeliverInvoicesForPrinting({
            toDeliverSelectedDate,
            toDeliverSearchTerm,
            toDeliverSelectedRegionalCodes
        });
    } catch (error) {
        console.error("Failed to prepare print content due to data fetching error.");
        // Optional: Show toast notification here if configured
         // toast({ variant: 'destructive', title: 'Print Error', description: 'Could not load data for printing.' });
        return; // Stop execution if data fetching fails
    }
    // --- End Option 2 ---

    // --- 1. Generate the HTML Content First ---
    const currentDate = format(new Date(), 'd MMM yyyy');

    const filterParts = [];
    if (toDeliverSelectedDate) {
        filterParts.push(`<span class="filter-item">Date: ${toDeliverSelectedDate.toLocaleDateString()}</span>`);
    }
    if (toDeliverSearchTerm) {
        filterParts.push(`<span class="filter-item">Search: ${toDeliverSearchTerm}</span>`);
    }
    if (toDeliverSelectedRegionalCodes.length > 0) {
        filterParts.push(`<span class="filter-item">Regions: ${toDeliverSelectedRegionalCodes.join(', ')}</span>`);
    }

    const filterDisplay = filterParts.length > 0
        ? filterParts.join(' ')
        : '<span class="filter-item filter-none">No filters applied</span>';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title> </title>
          <style>
            @page {
              size: A4 portrait;
              margin: 1cm; /* Standard margin */
               @bottom-right { /* CSS Page Numbering */
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10px; /* Increased font size */
                    color: #555;
                    padding-top: 5px; /* Add some space */
              }
            }
            *, *::before, *::after {
                box-sizing: border-box;
            }
            html {
                margin: 0;
                padding: 0;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
              background: white;
              font-size: 13px; /* Increased base font size */
            }
            .print-container {
              max-width: 100%;
              margin: 0 auto;
              padding: 0;
              break-before: avoid;
              page-break-before: avoid;
            }
            .header {
              padding-bottom: 10px; /* Increased padding */
              margin-bottom: 18px; /* Increased margin */
              border-bottom: 2px solid #2563eb;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .title-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title {
              font-size: 22px; /* Increased font size */
              font-weight: bold;
              color: #2563eb;
              margin: 0 0 5px 0; /* Adjusted margin */
            }
            .company {
              font-size: 14px; /* Increased font size */
              font-weight: normal;
              margin: 0;
            }
            .date {
              font-size: 12px; /* Increased font size */
              color: #666;
              margin: 4px 0; /* Adjusted margin */
            }
            .logo {
              text-align: right;
              font-size: 24px; /* Increased font size */
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 1px;
            }
            .filters {
              margin: 12px 0; /* Increased margin */
              font-size: 12px; /* Increased font size */
            }
            .filter-item {
              display: inline-block;
              padding: 3px 7px; /* Adjusted padding */
              margin-right: 7px; /* Adjusted margin */
              margin-bottom: 5px;
              background-color: #f3f4f6;
              border-radius: 4px;
              border-left: 3px solid #2563eb;
            }
            .filter-none {
              border-left-color: #9ca3af;
            }
            .table-container {
              width: 100%;
              margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px; /* Increased table font size */
              margin-bottom: 18px; /* Increased margin */
              table-layout: auto;
              break-inside: auto;
              page-break-inside: auto;
            }
            thead {
                display: table-header-group;
            }
            th {
              background-color: #2563eb;
              color: white;
              font-weight: bold;
              text-align: left;
              padding: 7px 9px; /* Increased padding */
              border: 1px solid #ddd;
              font-size: 12px; /* Explicitly set header font size */
            }
            tbody tr {
               break-inside: avoid;
               page-break-inside: avoid;
            }
            td {
              padding: 6px 9px; /* Increased padding */
              border: 1px solid #ddd;
              text-align: left;
              word-wrap: break-word;
              vertical-align: top; /* Align text to top for consistency */
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .summary {
              margin-top: 18px; /* Increased margin */
              text-align: right;
              font-size: 12px; /* Increased font size */
              font-weight: bold;
              break-before: avoid;
              page-break-before: avoid;
            }
            .summary-box {
              display: inline-block;
              padding: 7px 14px; /* Increased padding */
              background-color: #f3f4f6;
              border-radius: 4px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .footer { /* Footer might be less relevant with CSS page numbers */
              margin-top: 25px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              font-size: 10px; /* Increased font size */
              color: #666;
            }
            .signature-line {
              margin-top: 45px;
              border-top: 1px solid #aaa;
              width: 180px;
              padding-top: 5px;
              text-align: center;
              font-size: 10px; /* Increased font size */
              color: #333;
              break-before: avoid;
              page-break-before: avoid;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <div class="title-section">
                <div>
                  <h1 class="title">Packages to be Delivered</h1>
                  <p class="date">Generated on: ${currentDate}</p>
                </div>
                <div class="logo">Sanjivan Medico Traders</div>
              </div>
              <div class="filters">
                ${filterDisplay}
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Date</th>
                    <th>Party Code</th>
                    <th>Medical Name</th>
                    <th>City</th>
                    <th>Invoice No.</th> <!-- MOVED HERE -->
                    <th>Regional Code</th>
                    <th>Payment Mode</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${toDeliverInvoices.map((invoice, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${invoice.generatedDate ? new Date(invoice.generatedDate).toLocaleDateString() : '-'}</td>
                      <td>${invoice.partyCode ?? '-'}</td>
                      <td>${invoice.medicalName ?? '-'}</td>
                      <td>${invoice.city ?? '-'}</td>
                      <td>${invoice.invoiceNumber ?? '-'}</td> <!-- MOVED HERE -->
                      <td>${invoice.regionalCode ?? '-'}</td>
                      <td>${invoice.paymodeMode ?? '-'}</td>
                      <td>${'&nbsp;&nbsp;'}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="summary">
              <div class="summary-box">
                Total Invoices: ${toDeliverInvoices.length}
              </div>
            </div>

            <!-- Optional Footer Content (if needed beyond page numbers) -->
            <!--
            <div class="footer">
               <span>Generated by System</span>
               <span></span> // Placeholder for right side if needed
            </div>
            -->
            <!-- Optional Signature Line -->
            <!--
            <div class="signature-line">
                Receiver's Signature
            </div>
            -->

          </div>
        </body>
        </html>
    `;

    // --- 2. Create iframe and set up printing (Code remains the same) ---
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '1px'; // Minimal size
    printFrame.style.height = '1px'; // Minimal size
    printFrame.style.border = 'none'; // No border

    let cleanupTimeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
        if (cleanupTimeout) clearTimeout(cleanupTimeout);
        if (printFrame.parentNode === document.body) {
             console.log("Cleaning up iframe");
             document.body.removeChild(printFrame);
        }
    };

    printFrame.onload = () => {
        console.log("iframe loaded, preparing to print");
        try {
            const frameWindow = printFrame.contentWindow;
            if (frameWindow) {
                setTimeout(() => {
                    console.log("Calling print...");
                    frameWindow.focus();
                    frameWindow.print();
                    cleanupTimeout = setTimeout(cleanup, 1500);
                }, 50);
            } else {
                throw new Error("Could not get iframe content window.");
            }
        } catch (error) {
            console.error("Print Error:", error);
            // toast({ variant: 'destructive', title: 'Print Error', description: 'Could not initiate print.' });
            cleanup();
        }
    };

     printFrame.onerror = (event, source, lineno, colno, error) => {
        console.error("iframe loading error:", error);
        // toast({ variant: 'destructive', title: 'Print Setup Error', description: 'Could not prepare document.' });
        cleanup();
    };

    // --- 3. Append iframe and set content using srcdoc (Code remains the same) ---
    document.body.appendChild(printFrame);
    printFrame.srcdoc = htmlContent;
    console.log("iframe appended, srcdoc set.");

    cleanupTimeout = setTimeout(() => {
        console.warn("iframe onload fallback cleanup triggered.");
        cleanup();
    }, 5000);
};