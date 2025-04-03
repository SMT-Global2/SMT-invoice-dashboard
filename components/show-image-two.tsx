'use client';

import { CldImage } from 'next-cloudinary';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogHeader,
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
import { useState, useEffect, useRef } from 'react';
import { getS3BucketUrl } from '@/lib/helper';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface ShowImageProps {
  images: string[];
  dialogTitle?: string;
  fileName?: string;
}

export function ShowImage({ images, dialogTitle, fileName }: ShowImageProps) {
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isFullSize, setIsFullSize] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const processImages = async () => {
      if (!images || images.length === 0) {
        setProcessedImages([]);
        setLoading(false);
        return;
      }
      try {
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
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate unique filename with timestamp
      const now = new Date();
      const date = format(now, 'dd/MM/yyyy');
      const time = format(now, 'hh:mm:ss:aa');
      const defaultName = `statement#${fileName || 'unnamed'}#${date}#${time}`;
      const filename = `${defaultName}.jpg`;
      
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Image downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
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

  // Generate the full title with timestamp
  const generateFullTitle = () => {
    const now = new Date();
    const date = format(now, 'dd/MM/yyyy');
    const time = format(now, 'hh:mm:ss:aa');
    return `statement#${fileName || 'unnamed'}#${date}#${time}`;
  };

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
          <span>View {images.length > 1 ? `(${images.length})` : ''}</span>
        </Button>
      </DialogTrigger>

      <DialogContent 
        className="max-w-3xl p-0"
      >
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {generateFullTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Carousel
            className="w-full"
            setApi={(api) => {
              api?.on("select", () => {
                setCurrentIndex(api.selectedScrollSnap());
                setZoom(1);
                setPosition({ x: 0, y: 0 });
              });
            }}
          >
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="flex flex-col w-full">
                    <div 
                      ref={containerRef}
                      className="flex items-center justify-center p-4 cursor-move"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={{ 
                        height: '60vh',
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
                        <img 
                          src={image}
                          alt={`Statement Image ${index + 1}`}
                          className="rounded-lg object-contain max-h-[55vh]"
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {images.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleZoom('out')}
              disabled={zoom <= 1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleZoom('in')}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFullSize(!isFullSize)}
            >
              {isFullSize ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => handleDownload(images[currentIndex])}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}