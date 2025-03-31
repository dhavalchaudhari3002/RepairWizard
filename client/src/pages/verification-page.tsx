import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function VerificationPage() {
  const [_, navigate] = useLocation();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Retrieve the image from sessionStorage
    const storedImage = sessionStorage.getItem('uploadedImage');
    if (storedImage) {
      setUploadedImage(storedImage);
    } else {
      toast({
        title: "No image found",
        description: "Please upload an image first",
        variant: "destructive",
      });
      navigate('/upload-image');
    }
  }, [navigate, toast]);

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card className="shadow-md border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Verification Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {uploadedImage && (
              <div className="flex justify-center mb-4">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded image" 
                  className="rounded-lg max-h-[200px] object-contain"
                />
              </div>
            )}
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-center">
                Your image has been successfully uploaded and verified.
                You can now proceed with your repair request.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/')} className="w-full">
                Continue to Repair Request
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/upload-image')}
                className="flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}