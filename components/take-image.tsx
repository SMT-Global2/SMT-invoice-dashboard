'use client';

import { useState, useEffect } from 'react';
import { Camera, CameraOff, Loader2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ShowImage } from "./show-image";
import { cn } from "@/lib/utils";

type TakeType = 'BOTH' | 'CAMERA' | 'UPLOAD'

export function TakeImage({ 
    imageKey,
    handleImageUpload,
    isUploading,
    isDisabled,
    showImages,
    takeType = 'BOTH'
} : {
    imageKey: number | string;
    handleImageUpload: any;
    isDisabled: boolean;
    isUploading: boolean;
    showImages: string[];
    takeType : TakeType
}) {
    const [cameraAvailable, setCameraAvailable] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        // Reset progress when upload starts
        if (isUploading) {
            setUploadProgress(0);
            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    // Simulate progress up to 90% - the last 10% will happen when upload completes
                    if (prev < 90) return prev + 10;
                    return prev;
                });
            }, 600);
            
            return () => clearInterval(interval);
        } else {
            // When upload completes, set to 100% then reset after a delay
            setUploadProgress(100);
            const timeout = setTimeout(() => setUploadProgress(0), 500);
            return () => clearTimeout(timeout);
        }
    }, [isUploading]);

    useEffect(() => {
        const checkCameraAvailability = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasCamera = devices.some(device => device.kind === 'videoinput');
                setCameraAvailable(hasCamera);
            } catch (error) {
                console.error('Error checking camera availability:', error);
                setCameraAvailable(false);
            }
        };

        checkCameraAvailability();
    }, []);

    return (
        <div className="flex items-center space-x-2">
            
            {(takeType === 'BOTH' || takeType === 'UPLOAD') && (
                <div className="relative">
                    <Button
                        variant="outline"
                        className={cn(
                            "gap-2 relative hover:opacity-90 transition-opacity",
                            isUploading && "border-primary text-primary"
                        )}
                        disabled={isDisabled || isUploading}
                    >
                        {isUploading ? (
                            <>
                                <div className="relative w-5 h-5 flex items-center justify-center">
                                    <Loader2 className='w-5 h-5 animate-spin absolute' />
                                    <div className="text-[9px] font-bold">{uploadProgress}%</div>
                                </div>
                            </>
                        ) : (
                            <Upload className='w-5 h-5'/>
                        )}
                    </Button>
                    {isUploading && (
                        <div className="absolute bottom-0 left-0 h-1 bg-primary rounded-full transition-all duration-300" 
                             style={{ width: `${uploadProgress}%` }}></div>
                    )}
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload(imageKey)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        hidden={isDisabled || isUploading}
                        style={{
                            pointerEvents: isDisabled || isUploading ? 'none' : 'auto'
                        }}
                    />
                </div>
            )}
            
            {cameraAvailable && (takeType === 'BOTH' || takeType === 'CAMERA') && (
                <div className="relative">
                    <Button
                        variant="outline"
                        className={cn(
                            "gap-2 z-10",
                            isUploading && "border-primary text-primary"
                        )}
                        disabled={isDisabled || isUploading}
                    >
                        {isUploading ? (
                            <>
                                <div className="relative w-5 h-5 flex items-center justify-center">
                                    <Loader2 className='w-5 h-5 animate-spin absolute' />
                                    <div className="text-[9px] font-bold">{uploadProgress}%</div>
                                </div>
                            </>
                        ) : (
                            <Camera className='w-5 h-5'/> 
                        )}
                    </Button>
                    {isUploading && (
                        <div className="absolute bottom-0 left-0 h-1 bg-primary rounded-full transition-all duration-300" 
                             style={{ width: `${uploadProgress}%` }}></div>
                    )}
                    <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload(imageKey)}
                        className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                        hidden={isDisabled || isUploading}
                        style={{
                            pointerEvents: isDisabled || isUploading ? 'none' : 'auto'
                        }}
                    />
                </div>
            )}
            
            {!cameraAvailable && takeType === 'CAMERA' && (
                <Button
                    variant="outline"
                    className="gap-2 z-10"
                    disabled={true}
                >
                    <CameraOff className='w-5 h-5 text-muted-foreground' />
                </Button>
             )
            }
            
            <ShowImage images={showImages} />
        </div>
    );
}