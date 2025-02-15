import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

declare module 'next-auth' {
  interface User {
    username: string;
  }
  
  interface Session {
    user: User & {
      id: string;
      username: string;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
  }
}

import { AuthOptions } from 'next-auth';

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text", placeholder: "Enter your username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }

        // For testing purposes, using a hardcoded user
        // In production, you should use proper database authentication
        if (credentials.username === "admin" && credentials.password === "password") {
          console.log('Login successful');
          return {
            id: "123",
            username: "admin",
            name: "Admin User",
          };
        }
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
      }
      return session;
    },
  },
};

