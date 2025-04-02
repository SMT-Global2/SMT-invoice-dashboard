import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import moment from 'moment-timezone';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }
  if (session.user.type !== 'ADMIN') {
    return Response.json({
      success: false,
      message: 'Forbidden'
    }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from')
      ? moment(searchParams.get('from')).startOf('day').toDate()
      : moment().subtract(30, 'days').startOf('day').toDate();
    
    const toDate = searchParams.get('to')
      ? moment(searchParams.get('to')).endOf('day').toDate()
      : moment().endOf('day').toDate();

    // Base where clause for date filtering
    const dateFilter = {
      generatedDate: {
        gte: fromDate,
        lte: toDate
      }
    };

    // Get basic inventory metrics
    const [
      totalInventoryCount,
      checkedInventories,
      uncheckedInventories,
      voucheredInventories,
      pendingVoucherInventories
    ] = await Promise.all([
      // Total inventory count
      prisma.inventory.count({
        where: dateFilter
      }),
      
      // Count of checked inventories
      prisma.inventory.count({
        where: {
          ...dateFilter,
          inventoryCheckUsername: { not: null }
        }
      }),
      
      // Count of unchecked inventories
      prisma.inventory.count({
        where: {
          ...dateFilter,
          inventoryCheckUsername: null
        }
      }),
      
      // Count of inventories with vouchers
      prisma.inventory.count({
        where: {
          ...dateFilter,
          voucherNumber: { not: null }
        }
      }),
      
      // Count of checked inventories without vouchers
      prisma.inventory.count({
        where: {
          ...dateFilter,
          inventoryCheckUsername: { not: null },
          voucherNumber: null
        }
      })
    ]);

    // Calculate efficiency (percentage of invoices that have been checked)
    const efficiency = totalInventoryCount > 0 
      ? Math.round((checkedInventories / totalInventoryCount) * 100) 
      : 0;

    // Group inventories by agency
    const inventoryByAgency = await prisma.inventory.groupBy({
      by: ['agencyCode'],
      where: dateFilter,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Get agency details for each agency code
    const agencyDetailsPromises = inventoryByAgency.map(async (agency) => {
      const agencyDetails = await prisma.agencyCode.findUnique({
        where: { code: agency.agencyCode },
        select: { companyName: true, shortName: true }
      });

      // Calculate percentage of total
      const percentage = totalInventoryCount > 0 
        ? (agency._count.id / totalInventoryCount) * 100 
        : 0;

      return {
        name: agencyDetails?.companyName || agency.agencyCode,
        count: agency._count.id,
        percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal place
      };
    });

    const agencies = await Promise.all(agencyDetailsPromises);

    // Format response to match the interface
    return NextResponse.json({
      metrics: {
        total: totalInventoryCount,
        checked: checkedInventories,
        vouchered: voucheredInventories,
        incomplete: pendingVoucherInventories,
        efficiency: efficiency
      },
      agencies
    });

  } catch (error) {
    console.error('Inventory Analytics API Error:', (error as any).message);
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 