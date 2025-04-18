# Product Description and Terms & Conditions: Sanjivan Medico Traders System

**Prepared For:** Mr. Sachin Sarda, Sanjivan Medico Traders  
**Prepared By:** Noobacker Enterprises  
**Date:** 5 April 2025

---

## 1. Introduction & System Overview

Noobacker Enterprises is pleased to present the **Sanjivan Medico Traders** system, a bespoke digital solution meticulously crafted to streamline and enhance the inventory management and delivery memo processing operations for Sanjivan Medico Traders. This comprehensive web application leverages modern technologies to provide a robust, efficient, and user-friendly platform, replacing manual processes with automated workflows, thereby minimizing errors, improving traceability, and boosting overall operational productivity.

The Sanjivan Medico Traders system is designed with scalability and ease-of-use at its core, ensuring that Sanjivan Medico Traders can manage its critical logistics data with precision and confidence.

---

## 2. Core Modules & Feature Overview

The Sanjivan Medico Traders system is architected around several interconnected modules designed to manage the complete operational workflow, from inventory and invoicing to delivery, billing, and administration.

### 2.1. Invoice Lifecycle Management

This core area handles the journey of an invoice through various stages:

*   **Invoice Creation (`/invoice`):**
    *   Registers new invoices, typically based on a selected date.
    *   Assigns `Party Code`, automatically fetching related customer details (Name, City).
    *   Selects `Payment Mode` (e.g., Cash, Cheque).
    *   Captures/Uploads initial invoice images (using device camera or gallery via `TakeImage`), handling compression and S3 storage.
    *   Saves the initial invoice record, validating required fields (Party, Payment Mode, Image). Includes a special "OTC" save option.
    *   Provides search by invoice number and status indicators (`Capsule`).
    *   Allows resetting unsaved/partially saved invoices.
*   **Invoice Checking (`/checking`):**
    *   Reviews invoices previously saved in the creation stage.
    *   Tabbed interface: "Unchecked" and "Checked".
    *   Displays full invoice details, including images (`ShowImage`).
    *   Allows filtering by date, invoice number, and regional code.
    *   Enables users to verify invoice details and mark them as "Checked".
    *   Allows modification of the `Payment Mode` at this stage.
    *   Provides an overview of already checked invoices.
*   **Invoice Packing (`/packing`):**
    *   Manages the packing process for checked invoices.
    *   Tabbed interface: "Unpacked" and "Packed".
    *   Displays invoice details for verification before packing.
    *   Captures/Uploads packing-specific images (e.g., photo of the parcel) using `TakeImage`, storing them on S3.
    *   Allows filtering by date, invoice number, and regional code.
    *   Marks invoices as "Packed" upon completion.
    *   Provides an overview of already packed invoices.
*   **Invoice Delivery (`/delivery`):**
    *   Tracks the final stage of the invoice lifecycle.
    *   Tabbed interface: "To Deliver", "In Transit", "Delivered".
    *   Manages the assignment, pickup, shipment tracking, and delivery confirmation of packed invoices.
    *   Utilizes dedicated components (`ToDeliverTable`, `InTransitTable`, `DeliveredTable`) for clarity.
*   **Billing Management (`/billing`):**
    *   Manages the billing status of invoices (likely post-delivery).
    *   Tabbed interface: "Unbilled Invoices" and "Billed Invoices".
    *   Provides views (`UnbilledTable`, `BilledTable`) to track and update the billing status.

### 2.2. Receipt Management (`/receipt`)

*   Handles the creation, viewing, updating, and deletion (CRUD) of payment receipts.
*   Uses `ReceiptDialog` for data entry/modification.
*   Features a `RecordTable` with filtering by search term, date, payment method (Cash, Cheque, NEFT/RTGS etc.), and user.
*   Includes pagination for managing large numbers of receipts.
*   **PDF Generation:** Creates PDF summaries of receipts based on active filters.

### 2.3. Inventory Management (`/inventory`)

*   Manages incoming inventory records associated with agencies.
*   Intuitive dialog (`InventoryDialog`) for creating/editing items (Agency Code, Invoice details, LR details, etc.).
*   Uses `AgencyCodeSelector` for easy lookup.
*   Features form validation (Zod).
*   Tabular display with "Inventory Check" and "Voucher" tabs.
*   Includes search, date filtering, and pagination.
*   Handles item deletion with confirmation.

### 2.4. Delivery Memo (DM) Management (`/deliverymemo`)

*   Digitizes the Delivery Memo workflow.
*   **Collection Tab:** Assigns DMs to parties (`PartyCodeSelector`) and users (`UserSelector`), tracks collection status (`Capsule`), records collection time, allows resetting.
*   **Checking Tab:** Verifies collected DMs, captures/uploads image proof (`TakeImage`), records checking time and user, allows resetting.
*   Features filtering by date, DM number, and regional code.

### 2.5. Expiry Management (`/expiry`)

*   Tracks product expiry information.
*   Tabbed interface: "Record Table" and "Internal Operations".
*   **Record Table:** Manages CRUD operations for expiry items via `ExpiryDialog`, with search and date filters.
*   **Internal Operations:** Handles potentially imported expiry data, allowing association with a `Credit Note Number`.

### 2.6. Statement Processing (`/statement-excel`)

*   A comprehensive module for processing party statements uploaded via Excel files.
*   Parses uploaded `.xlsx` files, extracting party details and transaction data.
*   Associates statements with a specific date.
*   Allows viewing statement files, filtering by date, and expanding sections per party.
*   **Visit Tracking:** Enables field users to record visit details per party within a statement:
    *   Capture/Upload visit images (`TakeImage`).
    *   Record GPS location.
    *   Record timestamp and user.
    *   View saved visit details (images, map link, user, time).
*   **Export:** Generates individual party statement PDFs, a bulk ZIP of all party PDFs for a file, or downloads the data back to Excel.
*   Includes file management (rename, delete) and filtering by visit status/user.

### 2.7. Analytics & Reporting (`/analytics`)

*   Provides a centralized dashboard with various data visualizations.
*   Tabbed interface covering:
    *   **Invoice Analytics:** Stats cards, trends, status breakdowns, user activity, top parties, heatmaps.
    *   **User Performance:** Metrics specific to user activities.
    *   **Invoices Table:** Detailed administrative view of invoices.
    *   **Receipt Analytics:** Dedicated insights into receipt data.
    *   **Inventory Analytics:** Dedicated insights into inventory data.
    *   **Delivery Memo Analytics:** Dedicated insights into DM data.
    *   **Expiry Analytics:** Dedicated insights into expiry data.
*   Fetches data via `useAnalyticsStore` and dedicated API endpoints.

### 2.8. Administration & Master Data Management

*   **Employee Management (`/employee`):**
    *   Manages user accounts (employees).
    *   CRUD operations via `EmployeeDialog`.
    *   Displays employee details including username, assigned departments (visualized with badges), and type (User/Admin).
    *   Includes password visibility toggle for administrators.
*   **Agency Management (`/agency`):**
    *   Manages agency records (Code, Company Name, Short Name).
    *   CRUD operations via `AgencyDialog`.
    *   Features search by agency code and pagination.
*   **Party / Client Management (`/party`):**
    *   Manages client/party records (Code, Regional Code, Customer Name, City).
    *   CRUD operations via `PartyDialog`.
    *   Features search by party code and pagination.
    *   Includes functionality to view past delivery history for a specific party (`PastDeliveriesDialog`).

### 2.9. General System Features (Cross-Cutting)

*   **Modern User Interface (UI):** Built with React and Shadcn UI for a clean, responsive experience.
*   **Authentication & Authorization:** Secure login (NextAuth.js), potentially role-based access control (Admin vs User types, Department assignments).
*   **Department-Specific Access:** Users are granted access only to the modules and features relevant to their assigned department(s), enhancing security and simplifying the user experience.
*   **State Management:** Efficient client-side state using Zustand stores (`useInventoryStore`, `useDeliveryMemoStore`, `useInvoiceStore`, etc.).
*   **Real-time Feedback:** Toast notifications for user actions.
*   **Loading States:** Skeletons and spinners for better UX during data operations.
*   **Reusable Components:** Modular design (`DatePicker`, various Selectors, `TakeImage`, `Capsule`, etc.).
*   **Utility Functions:** Helpers for dates, images, S3 uploads.

---

## 3. Technical Stack Highlights

*   **Framework:** Next.js (React Framework)
*   **Language:** TypeScript
*   **UI Library:** Shadcn UI, Tailwind CSS
*   **State Management:** Zustand
*   **Form Handling:** React Hook Form, Zod (for validation)
*   **Database ORM:** Prisma
*   **Authentication:** NextAuth.js
*   **Deployment Platform:** (Assumed Vercel or similar Node.js compatible hosting)
*   **Cloud Storage:** AWS S3 (for image uploads)

---

## 4. Terms and Conditions (TnC)

The following terms and conditions govern the use and service of the Sanjivan Medico Traders system provided by Noobacker Enterprises to Sanjivan Medico Traders:

1.  **Domain Registration:** Noobacker Enterprises will register and manage a suitable domain name for the application for a period of **five (5) years** from the date of initial deployment, included as part of the initial project cost. Renewal of the domain after this period will be the responsibility of Sanjivan Medico Traders or can be managed by Noobacker Enterprises subject to additional charges.
2.  **Service & Maintenance:** Noobacker Enterprises guarantees the operational service and maintenance of the application for its **lifetime**, contingent upon the timely **upfront payment** of the Annual Maintenance Contract (AMC) fee.
3.  **Annual Maintenance Contract (AMC):**
    *   The AMC fee is payable annually, **upfront**, within the month of **March**.
    *   The AMC covers standard hosting costs, routine software updates (security patches, minor library updates), bug fixes arising from normal usage, and basic operational support during standard business hours.
    *   The AMC fee is subject to an annual increment of **three point eight percent (3.8%)** to account for inflation and evolving service costs. The first increment will apply starting from the second year's payment.
    *   Failure to pay the AMC fee by the due date (March 31st) may result in the suspension of services until the payment is cleared.
4.  **Additional Charges & Scope:**
    *   The AMC does **not** cover new feature development, significant modifications to existing features, major UI redesigns, third-party integration costs beyond the initial scope, or extensive data migration/correction tasks. Such requests will be quoted separately based on estimated effort.
    *   A **buffer or leverage charge allowance of up to ₹2,000 (Two Thousand Indian Rupees) per annum** is included within the AMC. This can cover minor, ad-hoc support requests or investigations that fall slightly outside the standard AMC scope (e.g., minor report tweaks, investigation of user-specific issues not related to bugs), at the discretion of Noobacker Enterprises. Usage beyond this buffer will be chargeable at standard hourly rates after prior notification and approval from Sanjivan Medico Traders.
5.  **Data Ownership:** Sanjivan Medico Traders retains full ownership of all data entered into the Sanjivan Medico Traders system. Noobacker Enterprises will provide data exports upon request, subject to reasonable notice and potentially chargeable if requiring significant custom formatting or effort outside standard procedures.
6.  **Confidentiality:** Both parties agree to maintain the confidentiality of proprietary information (including business processes, data structures, user information, and system design) shared during the project lifecycle and ongoing service period. This obligation survives the termination of the agreement.
7.  **Acceptable Use:** Sanjivan Medico Traders agrees to use the system solely for its intended purposes and in compliance with all applicable laws. Prohibited uses include attempting unauthorized access, disrupting service integrity, introducing malware, or storing illegal content.
8.  **Limitation of Liability:** Noobacker Enterprises shall not be liable for indirect, incidental, special, or consequential damages (including loss of profits or data) arising from the use or inability to use the Sanjivan Medico Traders system, even if advised of the possibility of such damages. The maximum liability of Noobacker Enterprises under this agreement, whether in contract, tort, or otherwise, shall be limited to the total AMC fee paid by Sanjivan Medico Traders for the twelve (12) month period preceding the event giving rise to the claim. This limitation does not apply to liabilities that cannot be excluded or limited under applicable law.
9. **Force Majeure:** Neither party shall be liable for any failure or delay in performance due to circumstances beyond its reasonable control, including but not limited to acts of God, war, riot, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials.
10. **Termination:**
    *   Either party may terminate this agreement with 30 days written notice if the other party materially breaches these Terms and Conditions and fails to cure such breach within the notice period.
    *   Noobacker Enterprises may suspend or terminate services immediately for non-payment of AMC fees as outlined in clause 3.
    *   Upon termination, Sanjivan Medico Traders' license to use the system ceases. Noobacker Enterprises will cooperate in providing a final data export (as per clause 5).

---

## 5. Key Benefits & Improvements Over Previous Methods

While specific performance data for the previous system is not available for direct graphical comparison, the Sanjivan Medico Traders system is designed to offer significant advantages:

*   **Enhanced Efficiency:** Automation of workflows (invoice processing, DM tracking, expiry management, statement handling) drastically reduces manual effort, data entry time, and potential for delays.
*   **Improved Accuracy:** Standardized data entry forms, validation rules (Zod), and reduced manual transcription minimize errors in inventory counts, invoice details, party information, and receipts.
*   **Increased Traceability:** Digital records with timestamps, user attributions, and image capture (for invoices, packing, DMs, statement visits) provide a clear audit trail for every step in the process.
*   **Centralized Data Access:** All operational data is stored and accessible within a single system, eliminating information silos and making it easier to find relevant details quickly.
*   **Real-time Visibility:** Dashboards and reporting features offer up-to-date insights into inventory levels, invoice statuses, DM progress, expiry dates, and overall operational performance.
*   **Better Collaboration:** Different departments (Invoice, Packing, Delivery, Billing, Admin) can work concurrently within the system, accessing the information they need based on their roles.
*   **Streamlined Reporting:** Automated generation of reports (e.g., PDF receipts, statement summaries, analytics dashboards) saves significant time compared to manual compilation.
*   **Improved Field Operations:** The Statement Processing module empowers field staff with tools for efficient visit tracking, data capture (images, location), and reporting directly within the application.
*   **Scalability:** The system is built on a modern tech stack designed to handle growing data volumes and user loads effectively.

---

## 6. Conclusion

The Sanjivan Medico Traders system represents a significant technological advancement for Sanjivan Medico Traders, poised to deliver tangible benefits in operational efficiency, data accuracy, and process control. Noobacker Enterprises is committed to providing a high-quality solution and ongoing support to ensure the long-term success of this implementation.

We look forward to deploying the Sanjivan Medico Traders system and supporting Sanjivan Medico Traders in leveraging its full potential. 