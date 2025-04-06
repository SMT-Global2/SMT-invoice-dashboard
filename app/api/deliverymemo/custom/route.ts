import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { findOrCreateDayStart } from '../startNo/helper';
import { UserType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    
    // Only admins can specify custom users
    if (session.user.type !== UserType.ADMIN) {
      return Response.json({
        success: false,
        message: 'Only admins can use this endpoint'
      }, { status: 403 });
    }

    const body = await request.json();
    const { dmNumber, partyCode, generatedDate, username } = body;

    if (!dmNumber || !partyCode || !username) {
      return Response.json({
        success: false,
        message: 'DM Number, Party Code, and Username are required'
      }, { status: 400 });
    }

    // Verify the specified user exists
    const userExists = await prisma.user.findUnique({
      where: {
        username: username
      }
    });

    if (!userExists) {
      return Response.json({
        success: false,
        message: 'Specified user does not exist'
      }, { status: 400 });
    }

    // Check if DM already exists
    const existingDM = await prisma.deliveryMemo.findUnique({
      where: {
        dmNumber: dmNumber
      }
    });

    let result;
    
    if (existingDM) {
      // Update existing DM
      result = await prisma.deliveryMemo.update({
        where: {
          dmNumber: dmNumber
        },
        data: {
          partyCode: partyCode,
          goodsCollectedUsername: username,
          goodsCollectedTimestamp: new Date()
        },
        include: {
          party: true
        }
      });
    } else {
      // Create new DM
      result = await prisma.deliveryMemo.create({
        data: {
          dmNumber: dmNumber,
          partyCode: partyCode,
          generatedDate: moment(generatedDate).toDate(),
          goodsCollectedUsername: username,
          goodsCollectedTimestamp: new Date()
        },
        include: {
          party: true
        }
      });

      // Update day start record with end number if needed
      const dayStart = await findOrCreateDayStart(moment(generatedDate).toDate());
      if (!dayStart.invoiceEndNo || dmNumber > dayStart.invoiceEndNo) {
        await prisma.dayStartDeliveryMemo.update({
          where: {
            date: moment(generatedDate).format('YYYY-MM-DD')
          },
          data: {
            invoiceEndNo: dmNumber
          }
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Delivery memo saved successfully with custom username',
      data: result
    });
  } catch (error) {
    console.error('Error saving delivery memo with custom username:', error);
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 