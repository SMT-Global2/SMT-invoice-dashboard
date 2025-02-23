import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { Department } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    if (session.user.type !== 'ADMIN') {
      return Response.json({
        success: false,
        message: 'Forbidden'
      }, { status: 403 });
    }

    const users = await prisma.user.findMany();

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

const UserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(1),
  phoneNumber: z.string().min(1),
  type: z.enum(['ADMIN', 'USER']),
  password: z.string().min(1),
  department: z.enum([Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT , Department.RECEIPT_MANAGEMENT]),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    if (session.user.type !== 'ADMIN') {
      return Response.json({
        success: false,
        message: 'Forbidden'
      }, { status: 403 });
    }


    const body = await request.json();
    const validatedData = UserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const visiblePassword = validatedData.password;

    if(validatedData.password){
      validatedData.password = bcrypt.hashSync(validatedData.password, 10);
    }

    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: validatedData.password,
        visiblePassword: visiblePassword,
       },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

const UserUpdateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(1),
  phoneNumber: z.string().min(1),
  type: z.enum(['ADMIN', 'USER']),
  password: z.string().optional().or(z.literal("")),
  department: z.enum([Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT , Department.RECEIPT_MANAGEMENT]),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});


export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    if (session.user.type !== 'ADMIN') {
      return Response.json({
        success: false,
        message: 'Forbidden'
      }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...data } = body;
    const validatedData = UserUpdateSchema.partial().parse(data);

    const visiblePassword = validatedData.password;

    if(validatedData.password){
      validatedData.password = bcrypt.hashSync(validatedData.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...validatedData,
        visiblePassword: visiblePassword,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    if (session.user.type !== 'ADMIN') {
      return Response.json({
        success: false,
        message: 'Forbidden'
      }, { status: 403 });
    }

    if(session.user.username === 'admin'){
      return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

