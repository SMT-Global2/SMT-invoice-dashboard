import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { CheckStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    //Get all invoices checked today or created today
  
    const data = await prisma.invoice.findMany({
      where : {
        OR: [
          {
            AND : [
              { checkTimestamp: { not: null } },
              { checkTimestamp: {
                gte: moment().startOf('day').toDate(),
                lte: moment().endOf('day').toDate(),
              }}
            ]
          },
          { generatedDate: {
            gte: moment().startOf('day').toDate(),
            lte: moment().endOf('day').toDate(),
          }}
        ]
      },
      include : {
        party : true,
        checkedBy : true,
        invoicedBy : true
      },
      orderBy: {
        generatedDate: 'desc'
      }
    });
  
    return Response.json({
      data: data || []
    });
    
  } catch (error) {
    console.log(error)
    return Response.json({
      error: 'Error fetching data'
    }, { status: 500 })
  }
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
    const searchParams = request.nextUrl.searchParams;
    //Get all invoices checked today or created today
    const invoiceNumber = searchParams.get('invoiceNumber');

    if (!invoiceNumber) {
      return Response.json({
        success: false,
        message: 'Invoice number is required'
      }, { status: 400 });
    }

    const result = await prisma.invoice.update({
      where: {
        invoiceNumber: parseInt(invoiceNumber)
      },
      data : {
        checkTimestamp : moment().toDate(),
        checkStatus : CheckStatus.CHECKED,
        checkedBy : {
          connect : {
            username : session.user.username
          }
        }
      },
    });
  
    return Response.json({
      success: true,
      message: 'Invoice checked successfully',
      data: result
    });
    
  } catch (error) {
    console.log(error)
    return Response.json({
      error: 'Error fetching data'
    }, { status: 500 })
  }
}
