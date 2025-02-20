export function tweleHrFormatDateString(date: Date) {
  // return new Date(date).toLocaleString();
  return new Date(date).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: true
  });
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

