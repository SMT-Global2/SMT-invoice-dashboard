'use client';

import { CldImage } from 'next-cloudinary';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageIcon } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';

interface ShowImageProps {
  images: string[];
  text?: string;
}

export function ShowImage({ images, text }: ShowImageProps) {
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processImages = async () => {
      if (!images || images.length === 0) {
        setProcessedImages([]);
        setLoading(false);
        return;
      }

      try {
        const { default: heic2any } = await import('heic2any'); // Import dynamically on the client

        const processed = await Promise.all(
          images.map(async (imageUrl) => {
            if (imageUrl.toLowerCase().endsWith('.heic')) {
              try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();

                const jpegBlob = await heic2any({
                  blob,
                  toType: 'image/jpeg',
                  quality: 1,
                });

                return URL.createObjectURL(jpegBlob as Blob);
              } catch (error) {
                console.error('Error converting HEIC image:', error);
                return imageUrl;
              }
            }
            return imageUrl;
          })
        );

        setProcessedImages(processed);
      } catch (error) {
        console.error('Error processing images:', error);
        setProcessedImages(images);
      } finally {
        setLoading(false);
      }
    };

    processImages();

    return () => {
      processedImages.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [images]);

  if (!images || images.length === 0) {
    return <span className="text-sm text-muted-foreground">No Image</span>;
  }

  if (loading) {
    return <span className="text-sm text-muted-foreground">Loading images...</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          {/* <span>View {images.length} {images.length === 1 ? 'Image' : 'Images'}</span> */}
          <span>{text ? text : 'View'} {images.length} {images.length === 1 ? '' : ''}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[60%] p-0 bg-background/90">
        <DialogTitle className="text-lg font-semibold m-2">View Images</DialogTitle>
        <Carousel className="w-full relative">
          <CarouselContent>
            {processedImages.map((image, index) => (
              <CarouselItem key={index}>
                <div className="flex items-center justify-center p-4">
                  <CldImage
                    src={image}
                    alt={`Bill Image ${index + 1}`}
                    width="1920"
                    height="1080"
                    crop={{
                      type: 'scale',
                      source: true,
                    }}
                    className="rounded-lg object-contain max-h-[80vh]"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {processedImages.length > 1 && (
            <>
              <CarouselPrevious
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 border-0 h-8 w-8"
              />
              <CarouselNext
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 border-0 h-8 w-8"
              />
            </>
          )}
          <div className="absolute bottom-4 right-4 bg-white/20 px-2 py-1 rounded text-black text-sm">
            {processedImages.length} {processedImages.length === 1 ? 'Image' : 'Images'}
          </div>
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
