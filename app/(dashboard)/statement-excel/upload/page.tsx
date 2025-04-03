'use client';

import React, { useState, useMemo } from 'react';

// --- Interfaces matching Backend ---
interface Total {
    debits: number | string;
    partAdjustment: number | string;
    balance: number | string;
    discountNarration: string;
    days: number | string;
}

interface FinancialEntry {
    dc: string;
    voucherDate: string;
    voucherNumber: string;
    debits: number | string;
    partAdjustment: number | string;
    balance: number | string;
    balanceCarryForward: number | string;
    days: number | string;
    discountNarration: string;
    adj: string;
}

interface PartyReport {
    partyCode: string;
    partyName: string;
    contactInfo: string;
    creditDays: string;
    entries: FinancialEntry[];
    total: Total | null;
}

const tableCellStyle = {
    padding: '8px',
    border: '1px solid #ddd',
    textAlign: 'left' as const
};

const numericCellStyle = {
    ...tableCellStyle,
    textAlign: 'right' as const
};

export default function StatementExcelUploadPage() {
    const [partySections, setPartySections] = useState<PartyReport[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPartyCode, setSelectedPartyCode] = useState<string | null>(null);

    // Ensure we always have arrays to work with
    const safePartySections = useMemo(() => {
        return Array.isArray(partySections) ? partySections : [];
    }, [partySections]);
    
    const filteredReports = useMemo(() => {
        if (!Array.isArray(safePartySections)) return [];
        
        return safePartySections.filter(report => {
            if (!searchTerm) return true;
            if (!report) return false;
            
            const name = report.partyName || '';
            const code = report.partyCode || '';
            
            return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   code.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [safePartySections, searchTerm]);

    const selectedPartyData = useMemo(() => {
        if (!selectedPartyCode || !Array.isArray(safePartySections)) return null;
        return safePartySections.find(p => p && p.partyCode === selectedPartyCode) || null;
    }, [safePartySections, selectedPartyCode]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setPartySections([]);
        setSelectedPartyCode(null);
        setSearchTerm('');
        setFileName(file.name);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/statement-excel/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.details || `Error ${response.status}: ${response.statusText}`);
            }

            // Ensure we have a valid array of party sections
            const sections = Array.isArray(result?.partySections) ? result.partySections : [];
            setPartySections(sections);
            
            if (sections.length === 0) {
                setError("No party statements found in the file. Please check the file format.");
            }
        } catch (err) {
            console.error("API call or processing failed:", err);
            setError(err instanceof Error ? err.message : "An unexpected error occurred while processing the file");
            setPartySections([]);
        } finally {
            setIsLoading(false);
            event.target.value = '';
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Statement Excel Viewer</h1>

            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <label htmlFor="file-upload" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                    Upload Excel File (.xlsx, .xls):
                </label>
                <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls"
                    disabled={isLoading}
                />
                {fileName && !isLoading && !error && <span style={{ marginLeft: '10px' }}>Loaded: {fileName}</span>}
            </div>

            {isLoading && <div style={{ color: 'blue', fontWeight: 'bold' }}>Processing file... Please wait.</div>}
            {error && <div style={{ color: 'red', fontWeight: 'bold', marginTop: '10px', border: '1px solid red', padding: '10px' }}>Error: {error}</div>}

            {!isLoading && !error && filteredReports && filteredReports.length > 0 && (
                <div>
                    <hr style={{ margin: '20px 0' }}/>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Filter by Party Name or Code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px', minWidth: '250px' }}
                        />

                        <select
                            value={selectedPartyCode || ''}
                            onChange={(e) => setSelectedPartyCode(e.target.value || null)}
                            style={{ padding: '8px', minWidth: '300px' }}
                        >
                            <option value="">-- Select Party ({filteredReports.length} of {safePartySections.length} found) --</option>
                            {filteredReports.map((report, index) => (
                                <option key={`${report.partyCode}-${index}`} value={report.partyCode}>
                                    {report.partyName} ({report.partyCode})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPartyData && (
                        <div style={{ border: '1px solid #ddd', padding: '15px', marginTop: '10px', backgroundColor: '#f9f9f9' }}>
                            <h2>{selectedPartyData.partyName} <span style={{ fontWeight: 'normal', color: '#555' }}>({selectedPartyData.partyCode})</span></h2>
                            <p style={{ color: '#333', marginBottom: '15px' }}>
                                Contact: {selectedPartyData.contactInfo || 'N/A'} | Credit Days: {selectedPartyData.creditDays || 'N/A'} | 
                                Transactions: {(selectedPartyData.entries && Array.isArray(selectedPartyData.entries)) ? selectedPartyData.entries.length : 0}
                            </p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                                <thead style={{ backgroundColor: '#eee' }}>
                                    <tr>
                                        <th style={tableCellStyle}>DC</th>
                                        <th style={tableCellStyle}>Date</th>
                                        <th style={tableCellStyle}>Voucher#</th>
                                        <th style={tableCellStyle}>Debits</th>
                                        <th style={tableCellStyle}>Part Adj.</th>
                                        <th style={tableCellStyle}>Balance</th>
                                        <th style={tableCellStyle}>Days</th>
                                        <th style={tableCellStyle}>Narration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPartyData.entries && Array.isArray(selectedPartyData.entries) && selectedPartyData.entries.length > 0 ? (
                                        selectedPartyData.entries.map((entry, index) => (
                                            <tr key={`${entry.voucherNumber || ''}-${index}`} style={index % 2 === 0 ? {} : { backgroundColor: '#fdfdfd' }}>
                                                <td style={tableCellStyle}>{entry.dc || ''}</td>
                                                <td style={tableCellStyle}>{entry.voucherDate || ''}</td>
                                                <td style={tableCellStyle}>{entry.voucherNumber || ''}</td>
                                                <td style={numericCellStyle}>{entry.debits || ''}</td>
                                                <td style={numericCellStyle}>{entry.partAdjustment || ''}</td>
                                                <td style={numericCellStyle}>{entry.balance || ''}</td>
                                                <td style={numericCellStyle}>{entry.days || ''}</td>
                                                <td style={tableCellStyle}>{entry.discountNarration || ''}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} style={{ ...tableCellStyle, textAlign: 'center' }}>No transactions found</td>
                                        </tr>
                                    )}
                                    {selectedPartyData.total && (
                                        <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                                            <td style={tableCellStyle}>Total</td>
                                            <td style={tableCellStyle}></td>
                                            <td style={tableCellStyle}></td>
                                            <td style={numericCellStyle}>{selectedPartyData.total.debits || ''}</td>
                                            <td style={numericCellStyle}>{selectedPartyData.total.partAdjustment || ''}</td>
                                            <td style={numericCellStyle}>{selectedPartyData.total.balance || ''}</td>
                                            <td style={numericCellStyle}>{selectedPartyData.total.days || ''}</td>
                                            <td style={tableCellStyle}>{selectedPartyData.total.discountNarration || ''}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 