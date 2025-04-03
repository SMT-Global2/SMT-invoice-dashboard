'use client';

import { useState, useEffect } from 'react';
import { Camera, CameraOff, Loader2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ShowImage } from "./show-image-two";


type TakeType = 'BOTH' | 'CAMERA' | 'UPLOAD'

interface TakeImageProps {
    imageKey: string | number;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, partyCode: string) => void;
    isDisabled: boolean;
    isUploading: boolean;
    showImages: string[];
    takeType: TakeType;
    isSaved?: boolean;
    dialogTitle?: string;
    fileName?: string;
}

export function TakeImage({
    imageKey,
    handleImageUpload,
    isDisabled,
    isUploading,
    showImages,
    takeType,
    isSaved,
    dialogTitle,
    fileName,
}: TakeImageProps) {
    const [cameraAvailable, setCameraAvailable] = useState(false);
    
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
            {!isSaved && (takeType === 'BOTH' || takeType === 'UPLOAD') && (
                <div className="relative">
                    <Button
                        variant="outline"
                        className="gap-2 relative hover:opacity-90 transition-opacity"
                        disabled={isDisabled || isUploading}
                    >
                        {isUploading ? <Loader2 className='w-5 h-5 animate-spin' /> : <Upload className='w-5 h-5'/>}
                    </Button>
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, imageKey.toString())}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        hidden={isDisabled || isUploading}
                        style={{
                            pointerEvents: isDisabled || isUploading ? 'none' : 'auto'
                        }}
                        multiple
                    />
                </div>
            )}
            
            {!isSaved && cameraAvailable && (takeType === 'BOTH' || takeType === 'CAMERA') && (
                <div className="relative">
                    <Button
                        variant="outline"
                        className="gap-2 z-10"
                        disabled={isDisabled || isUploading}
                    >
                        <Camera className='w-5 h-5'/> 
                    </Button>
                    <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleImageUpload(e, imageKey.toString())}
                        className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                        hidden={isDisabled || isUploading}
                        style={{
                            pointerEvents: isDisabled || isUploading ? 'none' : 'auto'
                        }}
                    />
                </div>
            )}
            
            {!isSaved && !cameraAvailable && takeType === 'CAMERA' && (
                <Button
                    variant="outline"
                    className="gap-2 z-10"
                    disabled={true}
                >
                    <CameraOff className='w-5 h-5 text-muted-foreground' />
                </Button>
            )}
            
            {showImages.length > 0 && (
                <ShowImage 
                    images={showImages} 
                    dialogTitle={dialogTitle}
                    fileName={fileName}
                />
            )}
        </div>
    );
}