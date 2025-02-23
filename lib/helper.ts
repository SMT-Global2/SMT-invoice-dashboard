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

export async function convertHeicImage(file: File): Promise<File> {
  if (!file) {
    throw new Error('No file provided');
  }

  const heic2any = await heic2anyPromise; // Ensure it's resolved globally

  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension === 'heic' || fileExtension === 'heif') {
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

export async function getPresignedUrl(fileName: string , contentType: string) {
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

export async function uploadFileToS3(presignedUrl: string, key: string, file: File) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
  });

  const data = await response.json();
  const uploadResult = data.uploadResult;

  return uploadResult;
}