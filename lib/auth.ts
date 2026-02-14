import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthOptions } from 'next-auth';
import { Department, UserType } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    username: string;
    type : UserType;
    department : Department[];
    sessionToken?: string;
    profileImage?: string | null;
  }

  interface Session {
    user: User & {
      id: string;
      username: string;
      type : UserType;
      department : Department[];
      sessionToken?: string;
      profileImage?: string | null;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    type : UserType;
    department : Department[];
    sessionToken?: string;
    profileImage?: string | null;
  }
}


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

        //Check using bcrpyt and prisma
        const user = await prisma.user.findUnique({ 
          where: { username: credentials.username },
          select: {
            id: true,
            username: true,
            type: true,
            department: true,
            sessionToken: true,
            password: true,
            employmentStatus: true,
            profileImage: true,
          }
        });

        if(!user) {
          console.log('User not found');
          return null;
        }

        // Prevent ex-employees from logging in
        if (user.employmentStatus === 'EX_EMPLOYEE') {
          throw new Error('Access denied: Inactive account (Ex-Employee). Please contact Owner / Admin if this is an error.');
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password!);

        if (!passwordMatch) {
          console.log('Password Mismatch');
          return null;
        }

        if (user) {
          return {
            id: user.id,
            username: user.username,
            type: user.type,
            department: user.department ?? [],
            sessionToken: user.sessionToken || undefined,
            profileImage: user.profileImage || null
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.type = user.type;
        token.department = user.department;
        token.sessionToken = user.sessionToken;
        token.profileImage = user.profileImage;
      }
      
      // Verify that the session token is still valid
      if (token.username && token.sessionToken) {
        const dbUser = await prisma.user.findUnique({
          where: { username: token.username },
          select: { sessionToken: true }
        });
        
        // If the session token doesn't match, invalidate the session
        if (dbUser && dbUser.sessionToken !== token.sessionToken) {
          return {
            ...token,
            error: "TokenMismatch"
          };
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if(!token.username) {
        return {
          ...session,
        }
      }
      if (session.user) {
        const userExists = await prisma.user.findUnique({
          where: {
            username : token.username
          },
          select: { sessionToken: true, profileImage: true }
        });

        if(!userExists) {
          return {
            ...session,
          }
        }
        
        // If the session token doesn't match, invalidate the session
        if (userExists.sessionToken && token.sessionToken && userExists.sessionToken !== token.sessionToken) {
          return {
            ...session,
            expires: new Date(0).toISOString()
          }
        }
        
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.type = token.type;
        session.user.department = token.department;
        session.user.sessionToken = token.sessionToken;
        session.user.profileImage = userExists.profileImage || null;
      }
      return session;
    },
  },
};

