import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { NextRequest } from 'next/server';

export async function findOrCreateDayStart(dateFilter : Date) {
    const result = await prisma.$transaction(async (prismaTxn) => {
  
      const alreadtExist = await prisma.dayStart.findUnique({
        where: {
          date: moment(dateFilter).format('YYYY-MM-DD')
        }
      }) 

      if(alreadtExist) return {
        invoiceStartNo: alreadtExist.invoiceStartNo,
        invoiceEndNo: alreadtExist.invoiceEndNo
      };
  
      //Create
      let invoiceStartNo = null;
      let invoiceEndNo = null;
  
      if(moment(dateFilter).isSame(moment() , 'day')) {
        //Create Start Date
        const maxInvoiceNumber = await prisma.invoice.findFirst({
          where : {
            generatedDate : {
              lt: moment(dateFilter).startOf('day').toDate()
            }
          },
          orderBy: {
            invoiceNumber: 'desc',
          }
        });
        if(maxInvoiceNumber){
          invoiceStartNo = maxInvoiceNumber.invoiceNumber + 1;
        } else {
          invoiceStartNo = 1;
        }
        await prisma.dayStart.create({
          data: {
            date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
            invoiceStartNo,
          }
        })
      } else {
  
        //Create Start Date
        const lowestInvoiceNumber = await prisma.invoice.findFirst({
          where : {
            generatedDate : {
              lte: moment(dateFilter).startOf('day').toDate()
            }
          },
          orderBy: {
            invoiceNumber: 'desc',
          }
        }) 
        const maxInvoiceNumber = await prisma.invoice.findFirst({
          where : {
            generatedDate : {
              gte: moment(dateFilter).startOf('day').toDate(),
              lte: moment(dateFilter).endOf('day').toDate(),
            }
          },
          orderBy: {
            invoiceNumber: 'desc',
          }
        });
  
        invoiceStartNo = lowestInvoiceNumber?.invoiceNumber ? lowestInvoiceNumber.invoiceNumber + 1 : 1;
        invoiceEndNo = maxInvoiceNumber?.invoiceNumber ? maxInvoiceNumber.invoiceNumber : null;
  
        await prisma.dayStart.create({
          data: {
            date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
            invoiceStartNo,
            invoiceEndNo
          }
        })
  
      }
      
      return {
        invoiceStartNo,
        invoiceEndNo
      }
    })
  
    return result;
  }
  