import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import moment from "moment";
import { CheckStatus, DeliveryStatus, PackageStatus, PaymodeMode } from "@prisma/client";
import { findOrCreateDayStart } from "../startNo/helper";

const invoiceSchema = z.object({
    invoiceNumber: z.number(),
    partyCode: z.string().nonempty('Party code is required'),
    image: z.array(z.string()),
    isOtc: z.boolean().default(true),
    generatedDate: z.string().datetime(),
    paymodeMode: z.nativeEnum(PaymodeMode)
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
        const validatedData = invoiceSchema.parse(body);

        // Check if invoice exist 
        const existingInvoice = await prisma.invoice.findUnique({
            where: {
                invoiceNumber: validatedData.invoiceNumber
            }
        })

        const data: any = {
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
            // Create invoice with validated data
            result = await prisma.$transaction(async (prismaTxn) => {
                // Get todays number
                const dayStart = await findOrCreateDayStart(moment().toDate(), prismaTxn);

                const newMax = Math.max(validatedData.invoiceNumber , dayStart?.invoiceEndNo || 0)
                
                // Update max and create invoice
                await prismaTxn.dayStartInvoice.update({
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
                        generatedDate: new Date(validatedData.generatedDate),
                        invoiceTimestamp: moment().toDate(),
                        invoiceUsername: session.user.username,
                        paymodeMode: validatedData.paymodeMode,
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

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return Response.json({
                success: false,
                message: 'Validation failed: ' + error.errors.map(err => err.message).join(', '),
                errors: error.errors.map(err => err.message)
            }, { status: 400 });
        }

        console.error('Save OTC Invoice Error:', error);

        return Response.json({
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
