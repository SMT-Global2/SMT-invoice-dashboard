import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import moment from "moment";
import { findOrCreateDayStart } from "../startNo/helper";
import { PaymodeMode } from "@prisma/client";

const invoiceSchema = z.object({
    invoiceNumber: z.number(),
    partyCode: z.string().nonempty('Party code is required'),
    paymodeMode: z.nativeEnum(PaymodeMode),
    image: z.array(z.string()).nonempty('Atleast one image is required'),
    isOtc: z.boolean().default(false),
    generatedDate: z.string().datetime(),
    invoiceTimestamp: z.string().datetime()
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

        // Create invoice with validated data
        const result = await prisma.$transaction(async (prismaTxn) => {
            // If a stale invoice with this number exists (e.g. from a misconfigured sequence),
            // delete it so the new one can take its place.
            const existing = await prismaTxn.invoice.findUnique({
                where: { invoiceNumber: validatedData.invoiceNumber }
            });

            if (existing) {
                await prismaTxn.invoice.delete({
                    where: { invoiceNumber: validatedData.invoiceNumber }
                });
            }

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
                    ...validatedData,
                    generatedDate: new Date(validatedData.generatedDate),
                    invoiceTimestamp: new Date(validatedData.invoiceTimestamp),
                    invoiceUsername: session.user.username
                }
            })
            return result;
        })

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

        console.error('Save Invoice Error:', error);

        // Handle specific Prisma errors or custom errors
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = error.message?.includes('already exists') ? 409 : 500;

        return Response.json({
            success: false,
            message: message
        }, { status });
    }
}
