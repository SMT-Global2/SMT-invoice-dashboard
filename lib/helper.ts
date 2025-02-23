'use client';

import imageCompression from 'browser-image-compression';

export function tweleHrFormatDateString(date: Date) {
  const formattedDate = new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  return formattedDate;
}

const heic2anyPromise = import('heic2any').then((mod) => mod.default);

export async function convertImage(file: File): Promise<File> {
  console.log('Converting image...');
  if (!file) {
    throw new Error('No file provided');
  }
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (fileExtension === 'heic' || fileExtension === 'heif') {
    const heic2any = await heic2anyPromise;
    console.log('Converting HEIC/HEIF to JPEG...');
    try {
      const blob: any = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 1,
      });

      if (!blob) {
        throw new Error('HEIC conversion failed - no blob returned');
      }

      console.log('HEIC conversion successful, creating new File object');
      return new File([blob], file.name.replace(/\.(heic|HEIC|heif|HEIF)$/, '.jpg'), {
        type: 'image/jpeg',
      });
    } catch (heicError) {
      console.error('HEIC conversion error:', heicError);
      throw new Error('Failed to convert HEIC image. Please try converting it to JPEG first.');
    }
  }
  return file;
}

export async function compressImage(file: File) {
  console.log('Compressing image...');
  const options = {
    maxSizeMB: 0.8,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  // Compress the image
  const compressedFile = await imageCompression(file, options);
  console.log('Original file size:', file.size / 1024 / 1024, 'MB');
  console.log('Compressed file size:', compressedFile.size / 1024 / 1024, 'MB');

  return compressedFile;
}

export async function getPresignedUrl(fileName: string , contentType: string) {
  console.log('Getting presigned url...');
  const response = await fetch('/api/s3/presignedUrl', {
    method: 'POST',
    body: JSON.stringify({ 
      fileName: fileName,
      contentType: contentType
      }),
  });

  const data = await response.json();
  const presignedUrl = data.presignedUrl;
  const key = data.key;

  return { presignedUrl, key };
}

export async function uploadFileToS3(file: File) {
  console.log('File details:', {
    name: file.name,
    type: file.type,
    size: file.size,
    extension: file.name.split('.').pop()?.toLowerCase()
  });
  const {
    presignedUrl,
    key
  } = await getPresignedUrl(file.name, file.type);
  
  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });

  return {
    success: true,
    key: key
  }
}
//https://smt-images-bucket.s3.ap-south-1.amazonaws.com/1740321810294-shreyas
export function getS3BucketUrl(key: string) {
  return `https://${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${key}`;
}