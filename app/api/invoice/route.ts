import { prisma } from '@/lib/prisma'
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await prisma.invoice.findMany();
  
  return Response.json({
    data: data || []
  });
}


const invoiceSchema = z.object({
  date: z.string().datetime(),
  invoiceNumber: z.string(),
  partyCode: z.string(),
  medicalName: z.string(),
  city: z.string(),
  image: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate the request body against our schema
    const validatedData = invoiceSchema.parse(body);
    
    // TODO: Add your database logic here
    // const result = await prisma.invoice.create({
    //   data: validatedData
    // });

    return Response.json({ 
      success: true, 
      message: 'Invoice created successfully',
      data: validatedData 
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


