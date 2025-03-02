'use client';

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
  console.log("HERE" , {file})
  return file;
}

// Helper function to load an image from a File object
async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url); // Clean up the object URL after loading
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url); // Clean up on error
      reject(error);
    };
    img.src = url;
  });
}

// Main compression function
export async function compressImage(file: File): Promise<File> {
  // Load the image from the input file
  const img = await loadImage(file);

  // Define maximum width and calculate scaling factor
  const MAX_WIDTH = 1920;
  const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
  const width = img.width * scaleFactor;
  const height = img.height * scaleFactor;

  // Create a canvas to draw the resized image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  // Convert the canvas to a Blob with JPEG format and quality 0.25
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/jpeg',
      0.25
    );
  });

  // Generate a new file name with '_compressed.jpg' suffix
  const originalName = file.name;
  // const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
  const compressedName = originalName;

  // Create and return the compressed File object
  const compressedFile = new File([blob], compressedName, { type: 'image/jpeg' });
  return compressedFile;
}

export async function getPresignedUrl(fileName: string , contentType: string , prefixKeyId : string = '') {
  console.log('Getting presigned url...');
  const fileType = fileName.split('.').pop()?.toLowerCase();
  const fileNameWithoutType = fileName.split('.').slice(0, -1).join('.');
  const response = await fetch('/api/s3/presignedUrl', {
    method: 'POST',
    body: JSON.stringify({ 
        fileName: (prefixKeyId ? `invoice#${prefixKeyId}#${fileNameWithoutType}` : fileNameWithoutType) + new Date().toISOString() + '.' + fileType,
        contentType: contentType,
        // customKey : prefixKeyId + fileName
      }),
  });

  const data = await response.json();
  const presignedUrl = data.presignedUrl;
  const key = data.key;

  return { presignedUrl, key };
}

export async function uploadFileToS3(file: File , prefixKeyId : string = '') {
  console.log('File details:', {
    name: file.name,
    type: file.type,
    size: file.size,
    extension: file.name.split('.').pop()?.toLowerCase()
  });
  const {
    presignedUrl,
    key
  } = await getPresignedUrl(file.name, file.type, prefixKeyId);
  
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
  const encodedKey = encodeURIComponent(key);
  return `https://${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${encodedKey}`;
}