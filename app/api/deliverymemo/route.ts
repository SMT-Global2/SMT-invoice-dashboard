import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { findOrCreateDayStart } from './startNo/helper';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }
  
  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date');
  const checkingMode = searchParams.get('checkingMode') === 'true';

  const where: any = dateFilter
    ? {
      generatedDate: {
        gte: moment(dateFilter).startOf('day').toDate(),
        lte: moment(dateFilter).endOf('day').toDate(),
      }
    }
    : {
      generatedDate: {
        gte: moment().startOf('day').toDate(),
        lte: moment().endOf('day').toDate(),
      }
    };

  // If we're in checking mode, only return items that have been collected
  if (checkingMode) {
    where.goodsCollectedUsername = { not: null };
  }

  const data = await prisma.deliveryMemo.findMany({
    where,
    include: {
      party: true,
    },
    orderBy: {
      dmNumber: 'asc'
    },
  });

  return Response.json({
    data: data || []
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();

    const { dmNumber, partyCode, generatedDate } = body;

    if (!dmNumber || !partyCode) {
      return Response.json({
        success: false,
        message: 'DM Number and Party Code are required'
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
          goodsCollectedUsername: session.user.username,
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
          goodsCollectedUsername: session.user.username,
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
      message: 'Delivery memo saved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error saving delivery memo:', error);
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { dmNumber, image } = body;

    if (!dmNumber) {
      return Response.json({
        success: false,
        message: 'DM Number is required'
      }, { status: 400 });
    }

    if (!image || (Array.isArray(image) && image.length === 0)) {
      return Response.json({
        success: false,
        message: 'At least one image is required for checking'
      }, { status: 400 });
    }

    // Check if DM exists and has been collected
    const existingDM = await prisma.deliveryMemo.findUnique({
      where: {
        dmNumber: dmNumber
      }
    });

    if (!existingDM) {
      return Response.json({
        success: false,
        message: 'Delivery memo not found'
      }, { status: 404 });
    }

    if (!existingDM.goodsCollectedUsername) {
      return Response.json({
        success: false,
        message: 'Delivery memo must be collected before checking'
      }, { status: 400 });
    }

    // Update DM with checking information
    const result = await prisma.deliveryMemo.update({
      where: {
        dmNumber: dmNumber
      },
      data: {
        goodsCheckedUsername: session.user.username,
        goodsCheckedTimestamp: new Date(),
        image: Array.isArray(image) ? image : [image] // Ensure image is an array
      },
      include: {
        party: true
      }
    });

    return Response.json({
      success: true,
      message: 'Delivery memo checked successfully',
      data: result
    });
  } catch (error) {
    console.error('Error checking delivery memo:', error);
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dmNumber = searchParams.get('dmNumber');
    const isChecked = searchParams.get('isChecked') === 'true';

    if (!dmNumber) {
      return Response.json({
        success: false,
        message: 'DM Number is required'
      }, { status: 400 });
    }

    const dm = await prisma.deliveryMemo.findUnique({
      where: {
        dmNumber: parseInt(dmNumber),
        ...(isChecked && { goodsCheckedUsername: session.user.username })
      }
    });

    if (!dm) {
      return Response.json({
        success: false,
        message: 'Delivery memo not found'
      }, { status: 404 });
    }

    if (Math.abs(moment(dm.goodsCollectedTimestamp).diff(moment(), 'hours')) > 72) {
      return Response.json({
        success: false,
        message: 'Cannot reset delivery memo that is generated before 72 hours'
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (prismaTxn) => {
      // Delete delivery memo
      let result;
      if (isChecked) {
        result = await prisma.deliveryMemo.update({
          where: {
            dmNumber: parseInt(dmNumber)
          },
          data : {
            image : [],
            goodsCheckedUsername : null,
            goodsCheckedTimestamp : null,
          }
        });
      } else {
        result = await prisma.deliveryMemo.delete({
          where: {
            dmNumber: parseInt(dmNumber)
          },
        });
      }

      // Check if this was the end number and update day start record if needed
      if (moment(dm.generatedDate).isSame(moment(), 'day')) {
        const maxDmNumber = await findOrCreateDayStart(moment().toDate());
        if (maxDmNumber.invoiceEndNo && maxDmNumber.invoiceEndNo === parseInt(dmNumber)) {
          // Find 2nd highest number or set to null
          const secondBest = await prismaTxn.deliveryMemo.findFirst({
            where: {
              generatedDate: {
                gte: moment().startOf('day').toDate(),
                lte: moment().endOf('day').toDate(),
              }
            },
            orderBy: {
              dmNumber: 'desc'
            }
          });

          await prismaTxn.dayStartDeliveryMemo.update({
            where: {
              date: moment().format('YYYY-MM-DD')
            },
            data: {
              invoiceEndNo: secondBest?.dmNumber || null
            }
          });
        }
      }

      return result;
    });

    return Response.json({
      success: true,
      message: 'Delivery memo reset successfully',
      data: result
    });
  } catch (error) {
    console.error('Error resetting delivery memo:', error);
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
