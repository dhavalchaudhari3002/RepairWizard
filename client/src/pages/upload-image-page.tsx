import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { UploadImage } from '@/components/upload-image';

export default function UploadImagePage() {
  const [_, navigate] = useLocation();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUploaded = (imageData: string) => {
    setUploadedImage(imageData);
    console.log("Image uploaded successfully");
  };

  const handleContinue = () => {
    if (uploadedImage) {
      // Store the image in sessionStorage or context
      sessionStorage.setItem('uploadedImage', uploadedImage);
      
      // Navigate to the verification page
      navigate('/verification');
      
      toast({
        title: "Image uploaded",
        description: "Proceeding to verification step",
      });
    } else {
      toast({
        title: "No image selected",
        description: "Please upload an image to continue",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <UploadImage 
          onImageUploaded={handleImageUploaded}
          onContinue={handleContinue}
        />
      </div>
    </div>
  );
}