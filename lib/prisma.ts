import { PrismaClient } from '@prisma/client'
import moment from 'moment-timezone';

// Set default timezone
moment.tz.setDefault('Asia/Kolkata');

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Function to create a new PrismaClient instance with error logging
function createPrismaClient() {
  const client = new PrismaClient({
    log: ['error', 'warn'],
  });
  
  // Add logging for connection issues
  client.$connect()
    .then(() => {
      console.log('Successfully connected to the database');
    })
    .catch((err) => {
      console.error('Failed to connect to the database:', err);
    });
    
  return client;
}

// Use existing client if it exists, otherwise create a new one
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// In development, attach the client to the global object to reuse connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}