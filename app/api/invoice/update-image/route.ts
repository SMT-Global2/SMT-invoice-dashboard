import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const invoiceSchema = z.object({
    invoiceNumber: z.number(),
    image: z.array(z.string()).nonempty('Atleast one image is required'),
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

        const result = await prisma.$transaction(async (prismaTxn) => {
            const invoice = await prismaTxn.invoice.findUnique({
                where: {
                    invoiceNumber: validatedData.invoiceNumber
                }
            })

            if(!invoice) {
                return Response.json({
                    success: false,
                    message: 'Invoice not found'
                }, { status: 404 });
            }

            //Update image
            const res = await prismaTxn.invoice.update({
                where: {
                    invoiceNumber: validatedData.invoiceNumber
                },
                data: {
                    image: validatedData.image
                }
            })
            
            return res;
        })

        // console.log({result})

        return Response.json({
            success: true,
            message: 'Invoice image updated successfully',
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
