'use client';

export const tweleHrFormatDateString = (date: string | Date): string => {
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert to 12-hour format, handle midnight (0) as 12

  return `${day}/${month}/${year}, ${hours12}:${minutes} ${ampm}`;
};

export const formatDateOnly = (date: string | Date): string => {
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
};

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

  console.log("Asking for presigned url for " , {
    fileName,
    contentType,
    prefixKeyId
  });

  const fileType = fileName.split('.').pop()?.toLowerCase();
  const fileNameWithoutType = fileName.split('.').slice(0, -1).join('.');
  
  // Prepare request body based on whether we have prefixKeyId or not
  const requestBody = prefixKeyId ? {
    fileName: prefixKeyId,
    contentType: contentType,
  } : {
    fileName: fileName,
    contentType: contentType,
    type: 'other', // Default type for non-employee uploads
    firstName: 'user',
    lastName: 'upload'
  };
  
  const response = await fetch('/api/s3/presignedUrl', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  
  const data = await response.json();
  console.log("data", data);
  const presignedUrl = data.presignedUrl;
  const key = data.key;

  return { presignedUrl, key };
}

export async function uploadFileToS3(file: File , prefixKeyId : string = '') {
  console.log("uploading file to s3", {
    file,
    prefixKeyId
  });
  
  try {
    const {
      presignedUrl,
      key
    } = await getPresignedUrl(file.name, file.type, prefixKeyId);
    console.log("presignedUrl", presignedUrl);
    console.log("key", key);
    
    if (!presignedUrl || !key) {
      throw new Error('Failed to get presigned URL or key');
    }
    
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    return {
      success: true,
      key: key
    };
  } catch (error) {
    console.error('Error in uploadFileToS3:', error);
    throw error; // Re-throw the error so the calling function can handle it
  }
}

//https://smt-images-bucket.s3.ap-south-1.amazonaws.com/1740321810294-shreyas
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

//https://smt-images-bucket.s3.ap-south-1.amazonaws.com/1740321810294-shreyas
export function getS3BucketUrl(key: string) {
  return `https://${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
}