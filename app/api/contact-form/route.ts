import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const medicalName = formData.get('medicalName') as string;
    const city = formData.get('city') as string;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const issueType = formData.get('issueType') as string;
    const comments = formData.get('comments') as string;
    const isUrgent = formData.get('isUrgent') === 'true';
    const rating = parseInt(formData.get('rating') as string) || 0;
    
    const images: string[] = [];
    const imageFiles = formData.getAll('images') as File[];
    
    // Upload images to S3
    for (const file of imageFiles) {
      if (file instanceof File) {
        const buffer = await file.arrayBuffer();
        const fileName = `${Date.now()}-${file.name}`;
        const url = await uploadToS3(buffer, fileName);
        images.push(url);
      }
    }

    // Create contact form entry
    const contactForm = await prisma.contactForm.create({
      data: {
        medicalName,
        city,
        invoiceNumber,
        issueType,
        images,
        comments,
        isUrgent,
        rating,
        status: 'PENDING', // Set default status to PENDING
      },
    });

    return NextResponse.json(contactForm);
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const issueType = searchParams.get('issueType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const urgent = searchParams.get('urgent');

    const where: any = {};

    if (issueType) {
      where.issueType = issueType;
    }

    if (status) {
      where.status = status;
    }

    if (urgent === 'true') {
      where.isUrgent = true;
    } else if (urgent === 'false') {
      where.isUrgent = false;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const contactForms = await prisma.contactForm.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(contactForms);
  } catch (error) {
    console.error('Error fetching contact forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact forms' },
      { status: 500 }
    );
  }
} 