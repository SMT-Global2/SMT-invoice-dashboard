import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/',
    '/invoice',
    '/delivery',
    '/dashboard',
    '/packing',
    '/checking',
    '/analytics',
    '/employee',
    '/agency',
    '/party',
    '/statement',
    '/receipt',
    '/inventory',
    '/deliverymemo',
    '/expiry'
  ],
};