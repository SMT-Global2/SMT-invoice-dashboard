import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import moment from 'moment-timezone';
import { BilledStatus, PaymentMethod } from '@prisma/client'; // Import necessary enums

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
    const from = searchParams.get('from') || moment().subtract(30, 'days').format('YYYY-MM-DD');
    const to = searchParams.get('to') || moment().format('YYYY-MM-DD');
    const type = searchParams.get('type') || 'all'; // inventory, deliverymemo, expiry, statement

    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999); // End of day

    // Common date filter
    const dateFilter = {
      generatedDate: {
        gte: startDate,
        lte: endDate
      }
    };

    // Specific response based on the type requested
    let response = {};

    if (type === 'all' || type === 'inventory') {
      // Get inventory analytics
      const [
        totalInventoryCount,
        inventoryWithVoucherCount,
        inventoryByAgencyGroup,
        inventoryCheckUserStats,
        inventoryVoucherUserStats,
        inventoryPerDayRaw
      ] = await Promise.all([
        // Total count
        prisma.inventory.count({
          where: dateFilter
        }),
        // With voucher count
        prisma.inventory.count({
          where: {
            ...dateFilter,
            voucherNumber: { not: null }
          }
        }),
        // Group by agency code
        prisma.inventory.groupBy({
          by: ['agencyCode'],
          where: dateFilter,
          _count: true
        }),
        // Inventory check user stats
        prisma.inventory.groupBy({
          by: ['inventoryCheckUsername'],
          where: {
            ...dateFilter,
            inventoryCheckUsername: { not: null }
          },
          _count: true
        }),
        // Inventory voucher user stats
        prisma.inventory.groupBy({
          by: ['inventoryVoucherUsername'],
          where: {
            ...dateFilter,
            inventoryVoucherUsername: { not: null }
          },
          _count: true
        }),
        // Inventory per day (raw data with timestamps)
        prisma.inventory.groupBy({
          by: ['generatedDate'], // Keep timestamp for initial grouping
          where: dateFilter,
          _count: true
        })
      ]);

      // Calculate Without Voucher count
      const calculatedWithoutVoucherCount = totalInventoryCount - inventoryWithVoucherCount;

      // Fetch agency details separately to get names
      const agencyCodes = inventoryByAgencyGroup.map(g => g.agencyCode);
      const agencies = await prisma.agencyCode.findMany({
        where: { code: { in: agencyCodes } },
        select: { code: true, companyName: true, shortName: true }
      });
      const agencyNameMap = agencies.reduce((acc, agency) => {
        acc[agency.code] = agency.companyName || agency.shortName || agency.code;
        return acc;
      }, {} as Record<string, string>);

      // Combine agency counts with names
      const inventoryByAgency = inventoryByAgencyGroup.map(group => ({
        agencyCode: group.agencyCode,
        agencyName: agencyNameMap[group.agencyCode] || 'Unknown',
        _count: group._count
      }));

      // Aggregate perDay data manually by date
      const aggregatedPerDay = inventoryPerDayRaw.reduce((acc, day) => {
        const dateStr = moment(day.generatedDate).format('YYYY-MM-DD');
        acc[dateStr] = (acc[dateStr] || 0) + day._count;
        return acc;
      }, {} as Record<string, number>);

      const inventoryPerDay = Object.entries(aggregatedPerDay)
        .map(([date, count]) => ({ date: new Date(date), count }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date

      // Add to response
      response = {
        ...response,
        inventory: {
          totalCount: totalInventoryCount,
          withVoucherCount: inventoryWithVoucherCount,
          withoutVoucherCount: calculatedWithoutVoucherCount,
          percentWithVoucher: totalInventoryCount > 0 
            ? (inventoryWithVoucherCount / totalInventoryCount * 100).toFixed(2) 
            : "0.00",
          byAgency: inventoryByAgency,
          byUserCheck: inventoryCheckUserStats.map(stat => ({
            username: stat.inventoryCheckUsername || 'Unknown',
            count: stat._count
          })).filter(u => u.username !== null), // Filter out null usernames
          byUserVoucher: inventoryVoucherUserStats.map(stat => ({
            username: stat.inventoryVoucherUsername || 'Unknown',
            count: stat._count
          })).filter(u => u.username !== null), // Filter out null usernames
          perDay: inventoryPerDay, // Use aggregated data
        }
      };
    }

    if (type === 'all' || type === 'deliverymemo') {
      // Get delivery memo analytics
      const [
        totalDmCount,
        collectedDmCount,
        checkedDmCount,
        dmPerDay,
        dmByRegionalCode,
        dmCollectedUserStats,
        dmCheckedUserStats
      ] = await Promise.all([
        // Total count
        prisma.deliveryMemo.count({
          where: dateFilter
        }),
        // Collected count
        prisma.deliveryMemo.count({
          where: {
            ...dateFilter,
            goodsCollectedUsername: { not: null }
          }
        }),
        // Checked count
        prisma.deliveryMemo.count({
          where: {
            ...dateFilter,
            goodsCheckedUsername: { not: null }
          }
        }),
        // DM per day
        prisma.deliveryMemo.groupBy({
          by: ['generatedDate'],
          where: dateFilter,
          _count: true
        }),
        // DM by regional code
        prisma.deliveryMemo.groupBy({
          by: ['partyCode'],
          where: dateFilter,
          _count: true
        }).then(async (results) => {
          // Get regional codes for the party codes
          const partyCodes = results.map(r => r.partyCode);
          const parties = await prisma.partyCode.findMany({
            where: { code: { in: partyCodes } },
            select: { code: true, regionalCode: true }
          });
          
          // Create a map of party code to regional code
          const partyToRegional = parties.reduce((acc, party) => {
            acc[party.code] = party.regionalCode || 'Unknown';
            return acc;
          }, {} as Record<string, string>);
          
          // Group by regional code
          const byRegionalCode: Record<string, number> = {};
          results.forEach(r => {
            const regionalCode = partyToRegional[r.partyCode] || 'Unknown';
            byRegionalCode[regionalCode] = (byRegionalCode[regionalCode] || 0) + r._count;
          });
          
          return Object.entries(byRegionalCode).map(([code, count]) => ({ 
            regionalCode: code, 
            count 
          }));
        }),
        // DM collected user stats
        prisma.deliveryMemo.groupBy({
          by: ['goodsCollectedUsername'],
          where: {
            ...dateFilter,
            goodsCollectedUsername: { not: null }
          },
          _count: true
        }),
        // DM checked user stats
        prisma.deliveryMemo.groupBy({
          by: ['goodsCheckedUsername'],
          where: {
            ...dateFilter,
            goodsCheckedUsername: { not: null }
          },
          _count: true
        })
      ]);

      // Add to response
      response = {
        ...response,
        deliveryMemo: {
          totalCount: totalDmCount,
          collectedCount: collectedDmCount,
          checkedCount: checkedDmCount,
          percentCollected: totalDmCount > 0 
            ? (collectedDmCount / totalDmCount * 100).toFixed(2) 
            : 0,
          percentChecked: totalDmCount > 0 
            ? (checkedDmCount / totalDmCount * 100).toFixed(2) 
            : 0,
          perDay: dmPerDay.map(day => ({
            date: day.generatedDate,
            count: day._count
          })),
          byRegionalCode: dmByRegionalCode,
          byUserCollected: dmCollectedUserStats.map(stat => ({
            username: stat.goodsCollectedUsername,
            count: stat._count
          })),
          byUserChecked: dmCheckedUserStats.map(stat => ({
            username: stat.goodsCheckedUsername,
            count: stat._count
          }))
        }
      };
    }

    if (type === 'all' || type === 'expiry') {
      // Get expiry analytics
      const [
        totalExpiryCount,
        expiryWithCreditNoteCount,
        expiryPerDayRaw,
        expiryByRegionalCode,
        expiryUserStats,
        creditNoteUserStats
      ] = await Promise.all([
        prisma.expiry.count({ where: dateFilter }),
        prisma.expiry.count({
          where: { ...dateFilter, creditNoteNumber: { not: null } }
        }),
        // Expiry per day (raw total)
        prisma.expiry.groupBy({
          by: ['generatedDate'],
          where: dateFilter,
          _count: true
        }),
        // Expiry by regional code
        prisma.expiry.groupBy({ 
          by: ['partyCode'],
          where: dateFilter,
          _count: true
        }).then(async (results) => {
          const partyCodes = results.map(r => r.partyCode);
          const parties = await prisma.partyCode.findMany({ where: { code: { in: partyCodes } }, select: { code: true, regionalCode: true } });
          const partyToRegional = parties.reduce((acc, party) => { acc[party.code] = party.regionalCode || 'Unknown'; return acc; }, {} as Record<string, string>);
          const byRegionalCode: Record<string, number> = {};
          results.forEach(r => { const regionalCode = partyToRegional[r.partyCode] || 'Unknown'; byRegionalCode[regionalCode] = (byRegionalCode[regionalCode] || 0) + r._count; });
          return Object.entries(byRegionalCode).map(([code, count]) => ({ regionalCode: code, count }));
        }),
        prisma.expiry.groupBy({ by: ['expiryUsername'], where: dateFilter, _count: true }),
        prisma.expiry.groupBy({ by: ['creditNoteUsername'], where: { ...dateFilter, creditNoteUsername: { not: null } }, _count: true })
      ]);

      const calculatedWithoutCreditNoteCount = totalExpiryCount - expiryWithCreditNoteCount;

      // --- Aggregate Daily Data (Simplified) --- 
      const aggregatedPerDay: Record<string, number> = {}; 
      const dayFormat = 'YYYY-MM-DD';

      expiryPerDayRaw.forEach(day => {
        const dateStr = moment(day.generatedDate).format(dayFormat);
        aggregatedPerDay[dateStr] = (aggregatedPerDay[dateStr] || 0) + day._count;
      });

      // Fill gaps with total counts
      const finalPerDay = [];
      let currentDate = moment(startDate);
      const endMoment = moment(endDate);
      while (currentDate.isSameOrBefore(endMoment, 'day')) {
        const dateStr = currentDate.format(dayFormat);
        finalPerDay.push({ 
          date: currentDate.toDate(), 
          // Use 'count' as the key for total daily count
          count: aggregatedPerDay[dateStr] || 0 
        });
        currentDate.add(1, 'day');
      }

      response = {
        ...response,
        expiry: {
          totalCount: totalExpiryCount,
          withCreditNoteCount: expiryWithCreditNoteCount,
          withoutCreditNoteCount: calculatedWithoutCreditNoteCount,
          percentWithCreditNote: totalExpiryCount > 0 
            ? (expiryWithCreditNoteCount / totalExpiryCount * 100).toFixed(2) 
            : "0.00",
          // Use the simplified daily total count data
          perDay: finalPerDay, 
          byRegionalCode: expiryByRegionalCode,
          byUser: expiryUserStats.map(stat => ({
            username: stat.expiryUsername,
            count: stat._count
          })),
          byCreditNoteUser: creditNoteUserStats.map(stat => ({
            username: stat.creditNoteUsername,
            count: stat._count
          }))
        }
      };
    }

    if (type === 'all' || type === 'statement') {
      // Get statement analytics
      const [
        totalStatementCount,
        statementPerDay,
        statementUploadUserStats,
        reportSectionCount,
        savedReportSectionCount,
        unsavedReportSectionCount,
        reportSectionByRegional,
        reportSectionUserStats
      ] = await Promise.all([
        // Total count
        prisma.statement.count({
          where: {
            uploadDate: {
              gte: startDate,
              lte: endDate
            }
          }
        }),
        // Statement per day
        prisma.statement.groupBy({
          by: ['uploadDate'],
          where: {
            uploadDate: {
              gte: startDate,
              lte: endDate
            }
          },
          _count: true
        }),
        // Statement upload user stats
        prisma.statement.groupBy({
          by: ['uploadedUsername'],
          where: {
            uploadDate: {
              gte: startDate,
              lte: endDate
            },
            uploadedUsername: { not: null }
          },
          _count: true
        }),
        // Total report section count
        prisma.reportSection.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }),
        // Saved report section count
        prisma.reportSection.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            },
            isSaved: true
          }
        }),
        // Unsaved report section count
        prisma.reportSection.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            },
            isSaved: false
          }
        }),
        // Report section by regional code (partyCodes often include regional info)
        prisma.reportSection.groupBy({
          by: ['partyCode'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          _count: true
        }),
        // Report section user stats
        prisma.reportSection.groupBy({
          by: ['savedUsername'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            },
            savedUsername: { not: null }
          },
          _count: true
        })
      ]);

      // Add to response
      response = {
        ...response,
        statement: {
          totalCount: totalStatementCount,
          perDay: statementPerDay.map(day => ({
            date: day.uploadDate,
            count: day._count
          })),
          byUploadUser: statementUploadUserStats.map(stat => ({
            username: stat.uploadedUsername,
            count: stat._count
          })),
          reportSections: {
            totalCount: reportSectionCount,
            savedCount: savedReportSectionCount,
            unsavedCount: unsavedReportSectionCount,
            percentSaved: reportSectionCount > 0 
              ? (savedReportSectionCount / reportSectionCount * 100).toFixed(2) 
              : 0,
            byPartyCode: reportSectionByRegional.map(stat => ({
              partyCode: stat.partyCode,
              count: stat._count
            })),
            bySavedUser: reportSectionUserStats.map(stat => ({
              username: stat.savedUsername,
              count: stat._count
            }))
          }
        }
      };
    }

    if (type === 'all' || type === 'billing') {
      // Use billedTimestamp for date filtering
      const billingDateFilter = {
        billedTimestamp: {
          gte: startDate,
          lte: endDate,
          not: null // Ensure timestamp exists
        }
      };

      const [ 
        totalBilledCount,
        billedCashCount,
        billedCreditCount,
        billedPerDay,
        billedByUser
      ] = await Promise.all([
        // Total count
        prisma.invoice.count({
          where: { 
            ...billingDateFilter,
            billedStatus: BilledStatus.BILLED
          }
        }),
        // Billed Cash Count
        prisma.invoice.count({
          where: {
            ...billingDateFilter,
            billedStatus: BilledStatus.BILLED,
            paymodeMode: 'CASH'
          }
        }),
        // Billed Credit Count
        prisma.invoice.count({
          where: {
            ...billingDateFilter,
            billedStatus: BilledStatus.BILLED,
            paymodeMode: 'CREDIT'
          }
        }),
        // Billed per day
        prisma.invoice.groupBy({
          by: ['billedTimestamp'],
          where: {
            ...billingDateFilter,
            billedStatus: BilledStatus.BILLED
          },
          _count: {
            billedTimestamp: true
          }
        }),
        // Billed by user
        prisma.invoice.groupBy({
          by: ['billedUsername'],
          where: {
            ...billingDateFilter,
            billedStatus: BilledStatus.BILLED,
            billedUsername: { not: null }
          },
          _count: true
        })
      ]);

      response = {
        ...response,
        billing: {
          totalCount: totalBilledCount,
          cashCount: billedCashCount,
          creditCount: billedCreditCount,
          percentCash: totalBilledCount > 0 ? (billedCashCount / totalBilledCount * 100).toFixed(2) : 0,
          percentCredit: totalBilledCount > 0 ? (billedCreditCount / totalBilledCount * 100).toFixed(2) : 0,
          perDay: billedPerDay.map(day => ({
            // Group by date part only, as timestamp includes time
            date: moment(day.billedTimestamp).startOf('day').toDate(), 
            count: day._count.billedTimestamp 
          })).reduce((acc, curr) => {
             // Aggregate counts for the same day
            const existing = acc.find(item => moment(item.date).isSame(curr.date, 'day'));
            if (existing) {
              existing.count += curr.count;
            } else {
              acc.push(curr);
            }
            return acc;
          }, [] as { date: Date, count: number }[]),
          byUser: billedByUser.map(stat => ({
            username: stat.billedUsername,
            count: stat._count
          }))
        }
      };
    }
    
    if (type === 'all' || type === 'receipt') {
      // Use receiptTimestamp for date filtering
      const receiptDateFilter = {
        receiptTimestamp: {
          gte: startDate,
          lte: endDate,
          not: null // Ensure timestamp exists
        }
      };

      const [
        totalReceiptCount,
        receiptCashCount,
        receiptChequeCount,
        receiptPerDay,
        receiptByUser,
        totalReceiptAmount,
        receiptAmountByUser
      ] = await Promise.all([
        // Total count
        prisma.receipt.count({
          where: receiptDateFilter
        }),
        // Cash receipts
        prisma.receipt.count({
          where: {
            ...receiptDateFilter,
            paymentMethod: PaymentMethod.CASH
          }
        }),
        // Cheque receipts
        prisma.receipt.count({
          where: {
            ...receiptDateFilter,
            paymentMethod: PaymentMethod.CHEQUE
          }
        }),
        // Receipts per day
        prisma.receipt.groupBy({
          by: ['receiptTimestamp'],
          where: receiptDateFilter,
          _count: {
            receiptTimestamp: true
          }
        }),
        // Receipts by user
        prisma.receipt.groupBy({
          by: ['receiptUsername'],
          where: {
            ...receiptDateFilter,
            receiptUsername: { not: null }
          },
          _count: true
        }),
        // Total receipt amount
        prisma.receipt.aggregate({
          where: receiptDateFilter,
          _sum: { amount: true },
        }),
        // Receipt amount by user
        prisma.receipt.groupBy({
          by: ['receiptUsername'],
          where: {
            ...receiptDateFilter,
            receiptUsername: { not: null }
          },
          _sum: { amount: true },
        }),
      ]);
      
      response = {
        ...response,
        receipt: {
          totalCount: totalReceiptCount,
          cashCount: receiptCashCount,
          chequeCount: receiptChequeCount,
          percentCash: totalReceiptCount > 0 ? (receiptCashCount / totalReceiptCount * 100).toFixed(2) : 0,
          percentCheque: totalReceiptCount > 0 ? (receiptChequeCount / totalReceiptCount * 100).toFixed(2) : 0,
          perDay: receiptPerDay.map(day => ({
             // Group by date part only
            date: moment(day.receiptTimestamp).startOf('day').toDate(),
            count: day._count.receiptTimestamp
          })).reduce((acc, curr) => {
             // Aggregate counts for the same day
            const existing = acc.find(item => moment(item.date).isSame(curr.date, 'day'));
            if (existing) {
              existing.count += curr.count;
            } else {
              acc.push(curr);
            }
            return acc;
          }, [] as { date: Date, count: number }[]),
          byUser: receiptByUser.map(stat => ({
            username: stat.receiptUsername,
            count: stat._count,
          })),
          totalAmount: totalReceiptAmount._sum.amount || 0,
          amountByUser: receiptAmountByUser.map(stat => ({
            username: stat.receiptUsername,
            amount: stat._sum.amount || 0,
          })),
        }
      };
    }

    return Response.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching extended analytics:', error);
    return Response.json({
      success: false,
      message: 'Error fetching extended analytics'
    }, { status: 500 });
  }
} 