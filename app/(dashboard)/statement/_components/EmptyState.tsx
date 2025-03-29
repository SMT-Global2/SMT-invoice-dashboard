import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileUp } from 'lucide-react';
import { EmptyStateProps } from '../_types';

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  message, 
  buttonText, 
  buttonAction,
  showUpload,
  handleFileUpload,
  isUploading
}) => (
  <Card className="shadow-sm">
    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <div className="text-muted-foreground">{message}</div>
      
      {showUpload && (
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  <span>Upload Statement</span>
                </>
              )}
            </div>
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              accept=".txt,.csv,.xls,.xlsx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && handleFileUpload && !isUploading) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              disabled={isUploading}
            />
          </label>
        </div>
      )}
      
      {buttonText && buttonAction && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={buttonAction}
          className="mt-2"
        >
          {buttonText}
        </Button>
      )}
    </CardContent>
  </Card>
);

export default EmptyState; 