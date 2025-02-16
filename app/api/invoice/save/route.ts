import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const invoiceSchema = z.object({
    invoiceNumber: z.number(),
    partyCode: z.string(),
    image: z.array(z.string()),
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
        const result = await prisma.invoice.create({
            data: {
                ...validatedData,
                invoiceUsername: session.user.username
            }
        });

        return Response.json({
            success: true,
            message: 'Invoice saved successfully',
            data: result
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            }, { status: 400 });
        }

        return Response.json({
            success: false,
            message: 'Internal server error'
        }, { status: 500 });
    }
}
