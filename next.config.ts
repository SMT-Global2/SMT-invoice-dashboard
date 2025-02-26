// next.config.js
import moment from 'moment-timezone';

moment.tz.setDefault('Asia/Kolkata');

export default {
  output: 'standalone',
  compress: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        search: ''
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        search: ''
      },
      {
        protocol: 'https',
        hostname: '*.s3.ap-south-1.amazonaws.com',
        search: ''
      }
    ]
  }
};
