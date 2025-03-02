'use client';

import { useState, useEffect } from 'react';
import { Camera, Loader2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ShowImage } from "./show-image";


type TakeType = 'BOTH' | 'CAMERA' | 'UPLOAD'

export function TakeImage({ 
    invoice, 
    handleImageUpload, 
    uploadingImage,
    isDisabled,
    showImages,
    takeType = 'BOTH'
} : {
    invoice: any;
    handleImageUpload: any;
    uploadingImage: any;
    isDisabled: boolean;
    showImages: any[];
    takeType : TakeType
}) {
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
            {(takeType === 'BOTH' || takeType === 'UPLOAD') && (
                <div className="relative">
                        <Button
                            variant="outline"
                            className="gap-2 z-10"
                            disabled={isDisabled}
                    >
                        {uploadingImage === invoice.invoiceNumber ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {/* Uploading... */}
                            </>
                        ) : (
                            <>
                                <Upload className='w-5 h-5'/> 
                                {/* Upload Image  */}
                            </>
                        )}
                    </Button>
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload(invoice.invoiceNumber)}
                        className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                        hidden={isDisabled}
                        style={{
                            pointerEvents: isDisabled ? 'none' : 'auto'
                        }}
                    />
                </div>
            )}
            
            {cameraAvailable && (takeType === 'BOTH' || takeType === 'CAMERA') && (
                <div className="relative">
                    <Button
                        variant="outline"
                        className="gap-2 z-10"
                        disabled={isDisabled}
                    >
                        <Camera className='w-5 h-5'/> 
                    </Button>
                    <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload(invoice.invoiceNumber)}
                        className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                        hidden={isDisabled}
                        style={{
                            pointerEvents: isDisabled ? 'none' : 'auto'
                        }}
                    />
                </div>
            )}
            
            <ShowImage invoice={invoice} images={showImages} />
        </div>
    );
}