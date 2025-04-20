import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import moment from 'moment-timezone';

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

    if (!medicalName || !city || !invoiceNumber || !issueType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const images: string[] = [];
    const imageFiles = formData.getAll('images') as File[];
    
    const imageKeys = [];
    // Upload images to S3
    for (const file of imageFiles) {
      if (file instanceof File) {
        const buffer = await file.arrayBuffer();
        const fileName = `contact-form/${medicalName}/${Date.now()}-${file.name}`;
        imageKeys.push(fileName);
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
        images: imageKeys,
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

    //Check if logged in 
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
        where.createdAt.gte = moment(startDate).startOf('day').toDate();
      }
      
      if (endDate) {
        where.createdAt.lte = moment(endDate).endOf('day').toDate();
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

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();


    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    // Validate status
    const { status } = body;
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Find and update the contact form
    const contactForms = await prisma.contactForm.findMany({
      where: { id }
    });
    
    if (contactForms.length === 0) {
      return NextResponse.json(
        { error: 'Contact form not found' },
        { status: 404 }
      );
    }
    
    // MongoDB update
    await prisma.contactForm.updateMany({
      where: { id },
      data: { status }
    });
    
    // Get the updated form
    const updatedForms = await prisma.contactForm.findMany({
      where: { id }
    });

    return NextResponse.json(updatedForms[0]);
  } catch (error) {
    console.error('Error updating contact form:', error);
    return NextResponse.json(
      { error: 'Failed to update contact form' },
      { status: 500 }
    );
  }
} 