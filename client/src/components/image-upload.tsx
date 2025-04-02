import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, X, UploadIcon, LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  initialImageUrl?: string;
  className?: string;
}

export default function ImageUpload({ 
  onImageUploaded, 
  initialImageUrl, 
  className 
}: ImageUploadProps) {
  const [image, setImage] = useState<string | null>(initialImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set initial image from props
  useEffect(() => {
    if (initialImageUrl) {
      setImage(initialImageUrl);
    }
  }, [initialImageUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Read the file and convert to base64 for preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageDataUrl = e.target?.result as string;
        setImage(imageDataUrl);
        onImageUploaded(imageDataUrl);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Callback with empty string to indicate removal
    onImageUploaded('');
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      
      {image ? (
        <div className="relative">
          <img 
            src={image} 
            alt="Uploaded" 
            className="w-full max-h-[300px] object-contain rounded-md border" 
          />
          <Button 
            variant="destructive" 
            size="icon" 
            className="absolute top-2 right-2 h-8 w-8 rounded-full" 
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Card 
          className="border-dashed cursor-pointer hover:bg-muted/50 transition"
          onClick={handleButtonClick}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            {isUploading ? (
              <LoaderIcon className="h-10 w-10 text-muted-foreground animate-spin" />
            ) : (
              <>
                <div className="mb-4 p-3 rounded-full bg-muted">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="mb-2 text-sm font-medium">
                  Click to upload an image
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}