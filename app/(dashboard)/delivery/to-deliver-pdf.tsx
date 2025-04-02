import moment from "moment-timezone";
import { DeliveryInvoiceData } from "@/store/useDeliveryInvoiceStore";
// Assuming you might still want toast notifications on error
// import { toast } from "@/components/ui/use-toast"; 

interface ToDeliverPrintContentProps {
    toDeliverInvoices: DeliveryInvoiceData[];
    toDeliverSelectedDate: Date | undefined;
    toDeliverSearchTerm: string;
    toDeliverSelectedRegionalCodes: string[];
}

type FetchToDeliverInvoicesForPrintingProps = {
  toDeliverSelectedDate: Date | undefined;
  toDeliverSearchTerm: string;
  toDeliverSelectedRegionalCodes: string[];
}

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
      url.searchParams.set('limit', '1000000');
      
      // Add search parameter
      if (toDeliverSearchTerm) {
        url.searchParams.set('search', toDeliverSearchTerm);
      }
      
      // Add regional code filter parameters
      if (toDeliverSelectedRegionalCodes.length > 0) {
        url.searchParams.set('regionalCodes', JSON.stringify(toDeliverSelectedRegionalCodes));
      }
      
      const response = await fetch(url.toString());
      const { data, totalPages } = await response.json();

      const proccesedData = data.map((item: any) => ({
        ...item,
        medicalName: item?.party?.customerName || '-',
        city: item?.party?.city || '-',
        regionalCode: item?.party?.regionalCode || '-',
      }));

      //Sort Data first regional code and then city and then invoice number
      proccesedData.sort((a: any, b: any) => {
        if (a.regionalCode !== b.regionalCode) {
          return a.regionalCode.localeCompare(b.regionalCode);
        }
        if (a.city !== b.city) {
          return a.city.localeCompare(b.city);
        }
        return a.invoiceNumber - b.invoiceNumber;
      });
      
      return proccesedData;
    };

    return await fetchInvoicesForPrinting();
  } catch (error) {
    console.error("Error fetching invoices for printing:", error);
    throw error;
  }
};


export const toDeliverPrintContent = async ({
    toDeliverSelectedDate,
    toDeliverSearchTerm,
    toDeliverSelectedRegionalCodes
}: ToDeliverPrintContentProps) => {

    const toDeliverInvoices = await fetchToDeliverInvoicesForPrinting({
      toDeliverSelectedDate,
      toDeliverSearchTerm,
      toDeliverSelectedRegionalCodes
    });

    // --- 1. Generate the HTML Content First ---
    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

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

    // Calculate total pages roughly (optional, for display in footer if needed, might be complex for accurate breaking)
    // const itemsPerPage = 30; // Estimate - adjust based on typical content height
    // const totalPages = Math.ceil(toDeliverInvoices.length / itemsPerPage) || 1;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Packages to be Delivered - ${currentDate}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 1cm; /* Standard margin */
            }
            *, *::before, *::after {
                box-sizing: border-box; /* Better layout consistency */
            }
            html {
                margin: 0;
                padding: 0;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0; /* Reset body margin */
              padding: 0; /* Reset body padding */
              color: #333;
              background: white; /* Ensure background for print */
            }
            .print-container {
              max-width: 100%;
              margin: 0 auto;
              padding: 0;
              break-before: avoid; /* Prevent a break right before the container */
              page-break-before: avoid; /* Legacy syntax */
            }
            .header {
              padding-bottom: 8px;
              margin-bottom: 15px; /* Slightly reduce margin */
              border-bottom: 2px solid #2563eb;
              break-inside: avoid; /* Try to keep header together */
              page-break-inside: avoid;
            }
            .title-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title {
              font-size: 20px; /* Slightly smaller */
              font-weight: bold;
              color: #2563eb;
              margin: 0 0 4px 0;
            }
            .company {
              font-size: 13px;
              font-weight: normal;
              margin: 0;
            }
            .date {
              font-size: 11px;
              color: #666;
              margin: 3px 0;
            }
            .logo {
              text-align: right;
              font-size: 22px; /* Slightly smaller */
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 1px;
            }
            .filters {
              margin: 10px 0; /* Slightly reduce margin */
              font-size: 11px;
            }
            .filter-item {
              display: inline-block;
              padding: 2px 6px;
              margin-right: 6px;
              margin-bottom: 4px; /* Allow wrapping */
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
              /* page-break-inside: avoid; /* Let table rows break naturally if needed */
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              margin-bottom: 15px;
              table-layout: auto; /* Let browser decide column widths */
              break-inside: auto;
              page-break-inside: auto;
            }
            thead {
                display: table-header-group; /* Crucial for repeating header on new pages */
            }
            th {
              background-color: #2563eb;
              color: white;
              font-weight: bold;
              text-align: left;
              padding: 6px 8px; /* Slightly smaller padding */
              border: 1px solid #ddd;
            }
            tbody tr {
               /* Ensure rows try not to break across pages */
               break-inside: avoid;
               page-break-inside: avoid;
            }
            td {
              padding: 5px 8px; /* Slightly smaller padding */
              border: 1px solid #ddd;
              text-align: left;
              word-wrap: break-word; /* Prevent long text overflow */
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .summary {
              margin-top: 15px;
              text-align: right;
              font-size: 11px;
              font-weight: bold;
              break-before: avoid; /* Don't start a new page just for summary */
              page-break-before: avoid;
            }
            .summary-box {
              display: inline-block;
              padding: 6px 12px;
              background-color: #f3f4f6;
              border-radius: 4px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .footer {
              margin-top: 20px; /* Reduced margin */
              padding-top: 8px;
              border-top: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #666;
              /* Position at bottom - tricky without complex JS page counting */
              /* Consider using @page { @bottom-center { content: "Page " counter(page); } } */
            }
            /* Optional: Page numbering via CSS */
            @page {
              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9px;
                color: #666;
              }
            }
            .signature-line {
              margin-top: 40px; /* Reduced margin */
              border-top: 1px solid #aaa;
              width: 180px;
              padding-top: 4px;
              text-align: center;
              font-size: 9px;
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
                  <p class="company">Medical Distribution System</p>
                  <p class="date">Generated on: ${currentDate}</p>
                </div>
                <div class="logo">SMT</div>
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
                    <th>Invoice No.</th>
                    <th>Party Code</th>
                    <th>Medical Name</th>
                    <th>City</th>
                    <th>Regional Code</th>
                    <th>Payment Mode</th>
                  </tr>
                </thead>
                <tbody>
                  ${toDeliverInvoices.map((invoice, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${new Date(invoice.generatedDate!).toLocaleDateString()}</td>
                      <td>${invoice.invoiceNumber}</td>
                      <td>${invoice.partyCode}</td>
                      <td>${invoice.medicalName}</td>
                      <td>${invoice.city}</td>
                      <td>${invoice.regionalCode}</td>
                      <td>${invoice.paymodeMode}</td>
                    </tr>
                  `).join('')}
                  ${/* Add empty rows if needed to push footer down on last page */ ''}
                </tbody>
              </table>
            </div>

            <div class="summary">
              <div class="summary-box">
                Total Invoices: ${toDeliverInvoices.length}
              </div>
            </div>

          </div>
        </body>
        </html>
    `;

    // --- 2. Create iframe and set up printing ---
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

    // Use onload event for better timing
    printFrame.onload = () => {
        console.log("iframe loaded, preparing to print");
        try {
            const frameWindow = printFrame.contentWindow;
            if (frameWindow) {
                // Give one last micro-task tick for rendering finalization (optional but sometimes helps)
                setTimeout(() => {
                    console.log("Calling print...");
                    frameWindow.focus(); // Focus is important
                    frameWindow.print(); // Trigger print dialog

                    // Set up cleanup after print command is issued
                    // Using a timeout as 'onafterprint' support can be inconsistent
                    // and the print dialog is modal anyway.
                    cleanupTimeout = setTimeout(cleanup, 1500); // Cleanup after 1.5 seconds

                }, 50); // Short delay after load
            } else {
                throw new Error("Could not get iframe content window.");
            }
        } catch (error) {
            console.error("Print Error:", error);
            // toast({ // Uncomment if using toast
            //     variant: 'destructive',
            //     title: 'Print Error',
            //     description: 'Something went wrong initiating the print process. Please try again.',
            // });
            cleanup(); // Clean up on error too
        }
    };

    // Handle potential errors loading the iframe content itself
     printFrame.onerror = (event, source, lineno, colno, error) => {
        console.error("iframe loading error:", error);
        // toast({ // Uncomment if using toast
        //   variant: 'destructive',
        //   title: 'Print Setup Error',
        //   description: 'Could not prepare the document for printing.',
        // });
        cleanup();
    };

    // --- 3. Append iframe and set content using srcdoc ---
    document.body.appendChild(printFrame);
    // Setting srcdoc is generally preferred over document.write
    printFrame.srcdoc = htmlContent; 
    console.log("iframe appended, srcdoc set.");


    // Fallback cleanup: If onload doesn't fire for some reason after a while
    cleanupTimeout = setTimeout(() => {
        console.warn("iframe onload fallback cleanup triggered.");
        cleanup();
    }, 5000); // 5 seconds timeout as a safety net
};