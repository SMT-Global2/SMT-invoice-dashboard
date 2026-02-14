import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import moment from 'moment-timezone';
import { Department } from '@prisma/client';
import { getCached, setCache } from '@/lib/api-cache';

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

  const cacheKey = request.url;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from')
      ? moment(searchParams.get('from')).startOf('day').toDate()
      : moment().subtract(30, 'days').startOf('day').toDate();

    const toDate = searchParams.get('to')
      ? moment(searchParams.get('to')).endOf('day').toDate()
      : moment().endOf('day').toDate();

    const departmentFilter = searchParams.get('department');

    // Get all users
    const userWhere: any = {};
    if (departmentFilter && departmentFilter !== 'ALL') {
      userWhere.department = {
        has: departmentFilter as Department
      };
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        department: true
      }
    });

    const invoiceDateFilter = { generatedDate: { gte: fromDate, lte: toDate } };
    const receiptDateFilter = { generatedDate: { gte: fromDate, lte: toDate } };
    const inventoryDateFilter = { generatedDate: { gte: fromDate, lte: toDate } };
    const dmDateFilter = { generatedDate: { gte: fromDate, lte: toDate } };
    const expiryDateFilter = { generatedDate: { gte: fromDate, lte: toDate } };

    // 12 groupBy queries instead of N*12 count queries
    const [
      invoicesCreatedByUser,
      invoicesCheckedByUser,
      invoicesPackedByUser,
      invoicesDeliveredByUser,
      invoicesBilledByUser,
      receiptsCreatedByUser,
      inventoriesCheckedByUser,
      inventoriesVoucheredByUser,
      dmsCollectedByUser,
      dmsCheckedByUser,
      expiriesUploadedByUser,
      expiriesCreditNotedByUser
    ] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['invoiceUsername'],
        where: { ...invoiceDateFilter, invoiceUsername: { not: null } },
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['checkUsername'],
        where: { ...invoiceDateFilter, checkUsername: { not: null } },
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['packageUsername'],
        where: { ...invoiceDateFilter, packageUsername: { not: null } },
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['deliveredUsername'],
        where: { ...invoiceDateFilter, deliveredUsername: { not: null } },
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['billedUsername'],
        where: { ...invoiceDateFilter, billedUsername: { not: null } },
        _count: true
      }),
      prisma.receipt.groupBy({
        by: ['receiptUsername'],
        where: { ...receiptDateFilter, receiptUsername: { not: null } },
        _count: true
      }),
      prisma.inventory.groupBy({
        by: ['inventoryCheckUsername'],
        where: { ...inventoryDateFilter, inventoryCheckUsername: { not: null } },
        _count: true
      }),
      prisma.inventory.groupBy({
        by: ['inventoryVoucherUsername'],
        where: { ...inventoryDateFilter, inventoryVoucherUsername: { not: null } },
        _count: true
      }),
      prisma.deliveryMemo.groupBy({
        by: ['goodsCollectedUsername'],
        where: { ...dmDateFilter, goodsCollectedUsername: { not: null } },
        _count: true
      }),
      prisma.deliveryMemo.groupBy({
        by: ['goodsCheckedUsername'],
        where: { ...dmDateFilter, goodsCheckedUsername: { not: null } },
        _count: true
      }),
      prisma.expiry.groupBy({
        by: ['expiryUsername'],
        where: { ...expiryDateFilter },
        _count: true
      }),
      prisma.expiry.groupBy({
        by: ['creditNoteUsername'],
        where: { ...expiryDateFilter, creditNoteUsername: { not: null }, creditNoteNumber: { not: null } },
        _count: true
      })
    ]);

    // Build lookup maps: username -> count
    const toMap = (results: any[], field: string) => {
      const map = new Map<string, number>();
      for (const r of results) {
        if (r[field]) map.set(r[field], r._count);
      }
      return map;
    };

    const maps = {
      invoicesCreated: toMap(invoicesCreatedByUser, 'invoiceUsername'),
      invoicesChecked: toMap(invoicesCheckedByUser, 'checkUsername'),
      invoicesPacked: toMap(invoicesPackedByUser, 'packageUsername'),
      invoicesDelivered: toMap(invoicesDeliveredByUser, 'deliveredUsername'),
      invoicesBilled: toMap(invoicesBilledByUser, 'billedUsername'),
      receiptsCreated: toMap(receiptsCreatedByUser, 'receiptUsername'),
      inventoriesChecked: toMap(inventoriesCheckedByUser, 'inventoryCheckUsername'),
      inventoriesVouchered: toMap(inventoriesVoucheredByUser, 'inventoryVoucherUsername'),
      dmsCollected: toMap(dmsCollectedByUser, 'goodsCollectedUsername'),
      dmsChecked: toMap(dmsCheckedByUser, 'goodsCheckedUsername'),
      expiriesUploaded: toMap(expiriesUploadedByUser, 'expiryUsername'),
      expiriesCreditNoted: toMap(expiriesCreditNotedByUser, 'creditNoteUsername')
    };

    // Merge with user list
    let userPerformanceData = users.map(user => {
      const invoicesCreated = maps.invoicesCreated.get(user.username) || 0;
      const invoicesChecked = maps.invoicesChecked.get(user.username) || 0;
      const invoicesPacked = maps.invoicesPacked.get(user.username) || 0;
      const invoicesDelivered = maps.invoicesDelivered.get(user.username) || 0;
      const invoicesBilled = maps.invoicesBilled.get(user.username) || 0;
      const receiptsCreated = maps.receiptsCreated.get(user.username) || 0;
      const inventoriesChecked = maps.inventoriesChecked.get(user.username) || 0;
      const inventoriesVouchered = maps.inventoriesVouchered.get(user.username) || 0;
      const dmsCollected = maps.dmsCollected.get(user.username) || 0;
      const dmsChecked = maps.dmsChecked.get(user.username) || 0;
      const expiriesUploaded = maps.expiriesUploaded.get(user.username) || 0;
      const expiriesCreditNoted = maps.expiriesCreditNoted.get(user.username) || 0;

      const totalActivity = invoicesCreated + invoicesChecked + invoicesPacked + invoicesDelivered + invoicesBilled +
        receiptsCreated + inventoriesChecked + inventoriesVouchered + dmsCollected +
        dmsChecked + expiriesUploaded + expiriesCreditNoted;

      const overallScore = totalActivity > 0 ? Math.round((
        (invoicesCreated * 1) + (invoicesChecked * 1.2) + (invoicesPacked * 1.5) +
        (invoicesDelivered * 1.8) + (invoicesBilled * 2) +
        (receiptsCreated * 1) + (inventoriesChecked * 1.2) + (inventoriesVouchered * 1.5) +
        (dmsCollected * 1) + (dmsChecked * 1.2) + (expiriesUploaded * 1) + (expiriesCreditNoted * 1.5)
      ) / (11.2) * 10) : 0;

      return {
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        department: Array.isArray(user.department) ? user.department : [],
        performance: {
          invoices: invoicesCreated,
          checking: invoicesChecked,
          packing: invoicesPacked,
          delivery: invoicesDelivered,
          billing: invoicesBilled,
          receipts: receiptsCreated,
          invChecks: inventoriesChecked,
          invVouchers: inventoriesVouchered,
          dmCollects: dmsCollected,
          dmChecks: dmsChecked,
          expUploads: expiriesUploaded,
          expCreditNotes: expiriesCreditNoted,
          overall: overallScore
        }
      };
    });

    // Filter out users with zero activity
    userPerformanceData = userPerformanceData.filter(user =>
      user.performance.invoices > 0 || user.performance.checking > 0 ||
      user.performance.packing > 0 || user.performance.delivery > 0 ||
      user.performance.billing > 0 || user.performance.receipts > 0 ||
      user.performance.invChecks > 0 || user.performance.invVouchers > 0 ||
      user.performance.dmCollects > 0 || user.performance.dmChecks > 0 ||
      user.performance.expUploads > 0 || user.performance.expCreditNotes > 0
    );

    // Sort by overall performance
    userPerformanceData.sort((a, b) => b.performance.overall - a.performance.overall);

    const result = { users: userPerformanceData };
    setCache(cacheKey, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('User Performance API Error:', (error as any).message);
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
