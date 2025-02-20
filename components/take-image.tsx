import { useState, useEffect } from 'react';
import { Camera, Loader2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ShowImage } from "./show-image";

export function TakeImage({ 
    invoice, 
    handleImageUpload, 
    uploadingImage,
    isDisabled,
    showImages
} : {
    invoice: any;
    handleImageUpload: any;
    uploadingImage: any;
    isDisabled: boolean;
    showImages: any[];
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
            <div className="relative">
                <Button
                    variant="outline"
                    className="gap-2 z-10"
                    disabled={isDisabled}
                >
                    {uploadingImage === invoice.invoiceNumber ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className='w-5 h-5'/> 
                            Upload Image 
                        </>
                    )}
                </Button>
                <Input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleImageUpload(invoice.invoiceNumber)}
                    className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                    hidden={isDisabled}
                    style={{
                        pointerEvents: uploadingImage === invoice.invoiceNumber ? 'none' : 'auto'
                    }}
                />
            </div>
            
            {cameraAvailable && (
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
                            pointerEvents: uploadingImage === invoice.invoiceNumber ? 'none' : 'auto'
                        }}
                    />
                </div>
            )}
            
            <ShowImage images={showImages} />
        </div>
    );
}