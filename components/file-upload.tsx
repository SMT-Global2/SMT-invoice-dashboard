import React, { useState, useRef } from 'react';
import { FileUp, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isLoading?: boolean;
  acceptTypes?: string;
  multiple?: boolean;
  className?: string;
  buttonText?: string;
  loadingText?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

export function FileUpload({
  onFilesSelected,
  isLoading = false,
  acceptTypes = ".xlsx,.xls,.txt,.csv",
  multiple = true,
  className = "",
  buttonText = "Upload File",
  loadingText = "Processing...",
  iconSize = "md"
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const iconSizeMap = {
    sm: { icon: 'w-4 h-4', button: 'h-9 px-3' },
    md: { icon: 'w-5 h-5', button: 'h-10 px-4' },
    lg: { icon: 'w-6 h-6', button: 'h-12 px-6 text-lg' },
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = multiple 
        ? droppedFiles
        : [droppedFiles[0]];
      
      onFilesSelected(validFiles);
    }
  };

  return (
    <div 
      className={cn(
        "relative group flex flex-col items-center justify-center h-full",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "w-full h-full border-2 border-dashed transition-all rounded-lg p-3 sm:p-6 flex flex-col items-center justify-center gap-3",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 group-hover:border-primary/50",
        )}
      >
        <div className="flex items-center justify-center w-full h-full">
          <label 
            htmlFor="file-upload-input" 
            className="w-full h-full cursor-pointer flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center justify-center gap-2 sm:gap-4 py-3 sm:py-5">
              <div className="bg-primary/10 rounded-full p-3 sm:p-6">
                {isLoading ? (
                  <Loader2 className={cn("text-primary animate-spin", 
                    iconSize === "lg" ? "w-8 h-8 sm:w-10 sm:h-10" : 
                    iconSize === "md" ? "w-6 h-6 sm:w-8 sm:h-8" : 
                    "w-5 h-5 sm:w-6 sm:h-6")} />
                ) : (
                  <Upload className={cn("text-primary", 
                    iconSize === "lg" ? "w-8 h-8 sm:w-10 sm:h-10" : 
                    iconSize === "md" ? "w-6 h-6 sm:w-8 sm:h-8" : 
                    "w-5 h-5 sm:w-6 sm:h-6")} />
                )}
              </div>
              
              <Button
                variant="default"
                className={cn(
                  "mt-2 gap-2 font-medium sm:px-8 w-full sm:w-auto max-w-[200px]",
                  iconSize === "lg" ? "sm:h-12 h-10 text-sm sm:text-base" : 
                  iconSize === "md" ? "h-9 sm:h-10" : 
                  "h-8 sm:h-9 text-xs sm:text-sm"
                )}
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={cn("animate-spin", iconSizeMap[iconSize].icon)} />
                    <span className="truncate">{loadingText}</span>
                  </>
                ) : (
                  <>
                    <FileUp className={iconSizeMap[iconSize].icon} />
                    <span className="truncate">{buttonText}</span>
                  </>
                )}
              </Button>
              
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-center px-2">
                {multiple ? "Drag & drop files or click to browse" : "Drag & drop a file or click to browse"}
              </p>
            </div>
            
            <input
              id="file-upload-input"
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              className="hidden"
              onChange={handleFileChange}
              multiple={multiple}
              disabled={isLoading}
            />
          </label>
        </div>
      </div>
    </div>
  );
} 