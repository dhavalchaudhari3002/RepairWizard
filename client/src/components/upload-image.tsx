import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Brain } from "lucide-react";

interface UploadImageProps {
  onImageUploaded?: (imageData: string) => void;
  onContinue?: () => void;
}

export function UploadImage({ onImageUploaded, onContinue }: UploadImageProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [useAIEstimates, setUseAIEstimates] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setIsUploading(true);
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          const imageData = e.target.result as string;
          setImageData(imageData);
          if (onImageUploaded) {
            onImageUploaded(imageData);
          }
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Upload Image</h2>
      
      <Card className="w-full shadow-md border-primary/10">
        <CardContent className="pt-6 space-y-4">
          {imageData ? (
            <div className="relative flex justify-center mb-4">
              <img 
                src={imageData} 
                alt="Uploaded image" 
                className="rounded-lg max-h-[200px] object-contain"
              />
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed rounded-lg mb-4">
              <input
                type="file"
                id="image-upload"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <label 
                htmlFor="image-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <div className="bg-primary/10 p-4 rounded-full mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
                <span className="font-medium">Click to upload an image</span>
                <p className="text-sm text-muted-foreground mt-1">Uploading an image helps us better diagnose your issue</p>
              </label>
            </div>
          )}
          
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <div className="flex items-center space-x-2">
              <Brain className={`h-5 w-5 ${useAIEstimates ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Use AI-powered cost estimates</span>
            </div>
            <Switch
              checked={useAIEstimates}
              onCheckedChange={setUseAIEstimates}
              aria-label="Toggle AI-based estimation"
            />
          </div>
          
          <Button 
            onClick={handleContinue}
            className="w-full" 
            disabled={isUploading}
          >
            {isUploading ? (
              "Processing image..." 
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue to Verification
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}