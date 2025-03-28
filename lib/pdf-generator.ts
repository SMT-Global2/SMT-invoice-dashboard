'use client';

import { Report, Statement } from './statement-service';
import { pdf, Document } from '@react-pdf/renderer';
import StatementPDF from '@/components/StatementPDF';
import React from 'react';

// This function creates a Document wrapper around our StatementPDF component
const createPDFDocument = (report: Report, statement: Statement) => {
  // Create a Document element which is what the pdf() function expects
  return React.createElement(
    Document,
    {},
    React.createElement(StatementPDF, { report, statement })
  );
};

export async function generatePDF(report: Report, statement: Statement) {
  try {
    // Generate PDF blob using our wrapper function
    const blob = await pdf(createPDFDocument(report, statement)).toBlob();
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${statement.name}_${report.partyCode}_${report.partyName}.pdf`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
} 