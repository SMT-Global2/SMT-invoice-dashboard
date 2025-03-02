'use client';

import { CldImage } from 'next-cloudinary';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageIcon, Download, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { getS3BucketUrl } from '@/lib/helper';
import { InvoiceData } from '@/store/useInvoiceStore';

interface ShowImageProps {
  invoice: InvoiceData;
  images: string[];
  text?: string;
}

export function ShowImage({ invoice , images, text }: ShowImageProps) {
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isFullSize, setIsFullSize] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const processImages = async () => {
      if (!images || images.length === 0) {
        setProcessedImages([]);
        setLoading(false);
        return;
      }

      try {
        // const { default: heic2any } = await import('heic2any'); // Import dynamically on the client

        // const processed = await Promise.all(
        //   images.map(async (imageUrl) => {
        //     if (imageUrl.toLowerCase().endsWith('.heic')) {
        //       try {
        //         const response = await fetch(imageUrl);
        //         const blob = await response.blob();

        //         const jpegBlob = await heic2any({
        //           blob,
        //           toType: 'image/jpeg',
        //           quality: 1,
        //         });

        //         return URL.createObjectURL(jpegBlob as Blob);
        //       } catch (error) {
        //         console.error('Error converting HEIC image:', error);
        //         return imageUrl;
        //       }
        //     }
        //     return imageUrl;
        //   })
        // );

        // setProcessedImages(processed);
        setProcessedImages(images);
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

  const handleDownload = async (imageUrl: string) => {
    try {
      // Append a cache-busting timestamp to avoid cached responses
      const url = imageUrl.includes('cloudinary') 
        ? imageUrl 
        : `${getS3BucketUrl(imageUrl)}?timestamp=${new Date().getTime()}`;
  
      // Fetch with specific options to handle CORS
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors', // Explicitly set to 'cors'
        cache: 'no-store', // Avoid caching issues
        headers: {
          'Accept': 'image/*', // Ensure the browser expects an image
        },
      });
  
      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
  
      // Extract filename (fixed splitting logic)
      const filenameParts = imageUrl.split('/').pop()?.split('_') || [];
      const filename = filenameParts[0] || `image-${Date.now()}.jpg`;
      link.download = filename;
  
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error : any) {
      console.error('Error downloading image:', error);
      // Log more details about the CORS error if available
      if (error.name === 'TypeError' && error.message.includes('cors')) {
        console.error('CORS issue detected. Check bucket CORS policy or network logs.');
      }
    }
  };


  const handleZoom = (type: 'in' | 'out') => {
    setZoom(prev => {
      if (type === 'in' && prev < 3) return prev + 0.5;
      if (type === 'out' && prev > 1) return prev - 0.5;
      return prev;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Calculate boundaries
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const maxX = (rect.width * (zoom - 1)) / 2;
    const maxY = (rect.height * (zoom - 1)) / 2;

    // Limit the dragging area
    const boundedX = Math.min(Math.max(newX, -maxX), maxX);
    const boundedY = Math.min(Math.max(newY, -maxY), maxY);

    setPosition({
      x: boundedX,
      y: boundedY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset position when zoom changes
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
  }, [zoom]);

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

      <DialogContent 
        className={`${isFullSize ? 'w-screen h-screen max-w-none sm:max-w-none' : 'sm:max-w-[60%]'} p-0`}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <DialogTitle className="text-lg font-semibold m-2">View Images (Invoice #{invoice.invoiceNumber}) </DialogTitle>
        <Carousel   
          className="w-full relative"
          setApi={(api) => {
            api?.on("select", () => {
              setCurrentIndex(api.selectedScrollSnap());
            });
          }}
        >
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index}>
                <div 
                  ref={containerRef}
                  className="flex items-center justify-center p-4 cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  style={{ 
                    overflow: 'hidden',
                    touchAction: 'none',
                    cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default')
                  }}
                >
                  <div 
                    style={{ 
                      transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                      transition: isDragging ? 'none' : 'transform 0.2s',
                    }}
                  >
                    {image.includes('cloudinary') ? (
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
                        draggable={false}
                      />
                    ) : (
                      <img 
                        src={getS3BucketUrl(image)} 
                        alt={`Bill Image ${index + 1}`} 
                        className="rounded-lg object-contain max-h-[80vh]"
                        draggable={false}
                      />
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Controls */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="hover:bg-accent"
              onClick={() => handleZoom('out')}
              disabled={zoom <= 1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="hover:bg-accent"
              onClick={() => handleZoom('in')}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="hover:bg-accent"
              onClick={() => setIsFullSize(!isFullSize)}
            >
              {isFullSize ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="hover:bg-accent"
              onClick={() => handleDownload(images[currentIndex])}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Existing carousel controls */}
          {processedImages.length > 1 && (
            <>
              <CarouselPrevious
                className="absolute left-4 top-1/2 -translate-y-1/2 hover:bg-accent border-0 h-8 w-8"
              />
              <CarouselNext
                className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-accent border-0 h-8 w-8"
              />
            </>
          )}
          <div className="absolute bottom-4 right-4 bg-accent/50 px-2 py-1 rounded text-foreground text-sm">
            {processedImages.length} {processedImages.length === 1 ? 'Image' : 'Images'}
          </div>
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
