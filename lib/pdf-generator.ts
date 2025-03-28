'use client';

import { Party, Statement } from './statement-service';
import { pdf, Document } from '@react-pdf/renderer';
import StatementPDF from '@/components/StatementPDF';
import React from 'react';

// This function creates a Document wrapper around our StatementPDF component
const createPDFDocument = (party: Party, statement: Statement) => {
  // Create a Document element which is what the pdf() function expects
  return React.createElement(
    Document,
    {},
    React.createElement(StatementPDF, { party, statement })
  );
};

export async function generatePDF(party: Party, statement: Statement) {
  try {
    // Generate PDF blob using our wrapper function
    const blob = await pdf(createPDFDocument(party, statement)).toBlob();
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${statement.name}_${party.partyCode}_${party.partyName}.pdf`;
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