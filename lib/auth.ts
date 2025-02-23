import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthOptions } from 'next-auth';
import { UserType } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    username: string;
    type : UserType;
  }
  
  interface Session {
    user: User & {
      id: string;
      username: string;
      type : UserType;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    type : UserType
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
        const user = await prisma.user.findUnique({ where: { username: credentials.username } });

        if(!user) {
          console.log('User not found');
          return null;
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
            type : user.type
          };
        }

        console.log('Wtf');
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
        // const userExists = await prisma.user.findUnique({
        //   where: {
        //     username : token.username
        //   }
        // });

        // if(!userExists) {
        //   return {
        //     ...session,
        //   }
        // }
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.type = token.type;
      }
      return session;
    },
  },
};

