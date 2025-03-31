import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { UploadImage } from '@/components/upload-image';

export default function UploadImagePage() {
  const [_, navigate] = useLocation();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUploaded = (imageData: string) => {
    console.log("Setting uploaded image data, length:", imageData.length);
    setUploadedImage(imageData);
    console.log("Image uploaded successfully");
  };

  const handleContinue = () => {
    console.log("Continue handler called, uploadedImage exists:", !!uploadedImage);
    
    if (uploadedImage) {
      // Store the image in sessionStorage or context
      console.log("Storing image in sessionStorage");
      sessionStorage.setItem('uploadedImage', uploadedImage);
      
      // Navigate to the verification page
      console.log("Navigating to verification page");
      navigate('/verification');
      
      toast({
        title: "Image uploaded",
        description: "Proceeding to verification step",
      });
    } else {
      console.log("No image selected");
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