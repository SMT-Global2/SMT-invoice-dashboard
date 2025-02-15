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

interface ShowImageProps {
  images: string[];
}

export function ShowImage({ images }: ShowImageProps) {
  if (!images || images.length === 0) {
    return 
      <span className="text-sm text-muted-foreground">
        No Image
      </span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          <span>View {images.length} {images.length === 1 ? 'Image' : 'Images'}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[60%] p-0 bg-white/90">
        <Carousel className="w-full relative ">
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index}>
                <div className="flex items-center justify-center p-4">
                  <CldImage
                    src={image}
                    alt={`Bill Image ${index + 1}`}
                    width="800"
                    height="800"
                    crop={{
                      type: 'auto',
                      source: true
                    }}
                    className="rounded-lg object-contain max-h-[80vh]"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {images.length > 1 && (
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
            {images.length} {images.length === 1 ? 'Image' : 'Images'}
          </div>
        </Carousel>
      </DialogContent>

    </Dialog>
  );
}
