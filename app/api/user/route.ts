import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

