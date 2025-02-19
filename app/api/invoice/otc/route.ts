import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import moment from "moment";
import { CheckStatus, DeliveryStatus, PackageStatus } from "@prisma/client";
import { findOrCreateDayStart } from "../startNo/helper";

const invoiceSchema = z.object({
    invoiceNumber: z.number(),
    partyCode: z.string().nonempty('Party code is required'),
    image: z.array(z.string()),
    isOtc: z.boolean().default(true),
    generatedDate: z.string().datetime()
});

export async function POST(req: Request) {
    try {
        // Get session using getServerSession (better for API routes)
        const session = await getServerSession(authOptions);

        if (!session?.user?.username) {
            return Response.json({
                success: false,
                message: 'Unauthorized'
            }, { status: 401 });
        }

        const body = await req.json();

        // Validate request data
        console.log({body})
        const validatedData = invoiceSchema.parse(body);

        //Check if invoice exist 

        const existingInvoice = await prisma.invoice.findUnique({
            where: {
                invoiceNumber: validatedData.invoiceNumber
            }
        })

        const data = {
            isOtc: true,
            image: validatedData.image,

            deliveredUsername: session.user.username,
            checkUsername: session.user.username,
            pickupUsername: session.user.username,
            packageUsername: session.user.username,

            checkStatus: CheckStatus.CHECKED,
            checkTimestamp: moment().toDate(),

            packageStatus: PackageStatus.PACKED,
            packageTimestamp: moment().toDate(),

            pickupTimestamp: moment().toDate(),

            deliveredTimestamp: moment().toDate(),
            deliveryStatus: DeliveryStatus.DELIVERED
        }
        let result = null;
        if (existingInvoice) {
            result = await prisma.invoice.update({
                where: {
                    invoiceNumber: validatedData.invoiceNumber
                },
                data: {
                    ...data
                }
            })
        } else {

            // Invocie number should be greater than the current maximum invoice number
            // const maxInvoiceNumber = await prisma.invoice.findFirst({
            //     orderBy: {
            //         invoiceNumber: 'desc'
            //     }
            // });
    
            // if (validatedData.invoiceNumber <= (maxInvoiceNumber?.invoiceNumber || 0)) {
            //     return Response.json({
            //         success: false,
            //         message: 'Invoice number should be greater than the current maximum invoice number'
            //     }, { status: 400 });
            // }
    
            // Create invoice with validated data

            const result = await prisma.$transaction(async (prismaTxn) => {
                //get todays number
                const maxInvoiceNumber = await findOrCreateDayStart(moment().toDate());

                const newMax = Math.max(validatedData.invoiceNumber , maxInvoiceNumber?.invoiceEndNo || 0)
                //Update max and create invoice
                await prismaTxn.dayStart.update({
                    where: {
                        date: moment().format('YYYY-MM-DD')
                    },
                    data: {
                        invoiceEndNo: newMax
                    }
                })
                const result = await prismaTxn.invoice.create({
                    data: {
                        partyCode: validatedData.partyCode,
                        invoiceNumber: validatedData.invoiceNumber,
                        generatedDate: validatedData.generatedDate,
                        invoiceTimestamp: moment().toDate(),
                        invoiceUsername: session.user.username,
                        ...data
                    }
                })
                return result;
            })
        }

        return Response.json({
            success: true,
            message: 'Invoice saved successfully',
            data: result
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json({
                success: false,
                message: 'Validation failed : ' + error.errors.map(err => err.message).join(', '),
                errors: error.errors.map(err => err.message)
            }, { status: 400 });
        }

        return Response.json({
            success: false,
            message: 'Internal server error'
        }, { status: 500 });
    }
}
