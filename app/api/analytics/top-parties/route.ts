import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Define interfaces for the data structures
interface PartyData {
  count: number;
  id: string;
  code: string;
  name: string;
}

interface FormattedPartyData {
  id: string;
  code: string;
  name: string;
  count: number;
  ranking: number;
  percentage: number;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const toDate = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
    
    // Build date filter
    const dateFilter: any = {}
    if (fromDate) {
      dateFilter.gte = fromDate
    }
    if (toDate) {
      dateFilter.lte = toDate
    }
    
    // Base where clause
    const whereClause: any = {}
    if (Object.keys(dateFilter).length > 0) {
      whereClause.invoiceTimestamp = dateFilter
    }
    
    // Get all invoices matching date filter to process
    const allInvoices = await prisma.invoice.findMany({
      where: whereClause,
      select: {
        partyCode: true,
        party: {
          select: {
            code: true,
            customerName: true,
            id: true
          }
        }
      }
    });
    
    // In schema.prisma there is no 'type' field for PartyCode
    // Instead we'll manually group parties by some criteria
    // For example: agencies might start with 'A-' and clients with 'C-'
    // or we can make a simple assumption for demo purposes
    
    // Count by party code
    const partyCodeCounts = new Map<string, PartyData>();
    
    allInvoices.forEach(invoice => {
      const currentCount = partyCodeCounts.get(invoice.partyCode) || {
        count: 0,
        id: invoice.party.id,
        code: invoice.partyCode,
        name: invoice.party.customerName || 'Unknown'
      };
      
      currentCount.count += 1;
      partyCodeCounts.set(invoice.partyCode, currentCount);
    });
    
    // For this example, we'll classify parties based on a simple assumption
    // Let's assume codes starting with A, B, or C are agencies, others are clients
    const agencyCodes: PartyData[] = [];
    const clientCodes: PartyData[] = [];
    
    // Fix the Map iterator issue by using Array.from()
    Array.from(partyCodeCounts.entries()).forEach(([code, data]) => {
      const firstChar = code.charAt(0).toUpperCase();
      if (['A', 'B', 'C'].includes(firstChar)) {
        agencyCodes.push(data);
      } else {
        clientCodes.push(data);
      }
    });
    
    // Sort by count (highest first)
    agencyCodes.sort((a, b) => b.count - a.count);
    clientCodes.sort((a, b) => b.count - a.count);
    
    // Take top 10
    const topAgencies = agencyCodes.slice(0, 10);
    const topClients = clientCodes.slice(0, 10);
    
    // Calculate totals for percentages
    const totalAgencyInvoices = topAgencies.reduce((sum, agency) => sum + agency.count, 0);
    const totalClientInvoices = topClients.reduce((sum, client) => sum + client.count, 0);
    
    // Format data with percentages and ranking
    const formattedAgencies: FormattedPartyData[] = topAgencies.map((agency, index) => {
      const percentage = totalAgencyInvoices > 0 
        ? (agency.count / totalAgencyInvoices) * 100 
        : 0;
      
      return {
        id: agency.id || '',
        code: agency.code,
        name: agency.name || 'Unknown',
        count: agency.count,
        ranking: index + 1,
        percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal place
      };
    });
    
    const formattedClients: FormattedPartyData[] = topClients.map((client, index) => {
      const percentage = totalClientInvoices > 0 
        ? (client.count / totalClientInvoices) * 100 
        : 0;
      
      return {
        id: client.id || '',
        code: client.code,
        name: client.name || 'Unknown',
        count: client.count,
        ranking: index + 1,
        percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal place
      };
    });
    
    return NextResponse.json({
      topClients: formattedClients,
      topAgencies: formattedAgencies
    });
    
  } catch (error) {
    console.error('Top Parties API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
} 