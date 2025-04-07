import React, { useState, useEffect } from 'react';
import { 
  checkCloudStorageStatus, 
  uploadFile, 
  deleteFile, 
  fileToBase64 
} from '@/lib/cloud-storage';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function CloudStorageDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'loading' | 'configured' | 'not_configured' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Checking Google Cloud Storage configuration...');
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string }[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  // Check Google Cloud Storage status on component mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const result = await checkCloudStorageStatus();
        setStatus(result.status);
        setStatusMessage(result.message);
      } catch (error) {
        setStatus('error');
        setStatusMessage('Failed to check Google Cloud Storage status');
        console.error('Error checking GCS status:', error);
      }
    }
    
    checkStatus();
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file first',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFile(file, {
        contentType: file.type,
        fileName: file.name,
        folder: 'demo'
      });

      if (result.success && result.url) {
        toast({
          title: 'File uploaded',
          description: 'Your file has been uploaded successfully',
        });
        
        // Add to uploaded files list
        setUploadedFiles(prev => [...prev, { 
          url: result.url as string, 
          name: file.name 
        }]);
        
        // Reset file input
        setFile(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        toast({
          title: 'Upload failed',
          description: result.error || 'An unknown error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Upload error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle file deletion
  const handleDelete = async (url: string, index: number) => {
    setDeleting(url);
    try {
      const result = await deleteFile(url);

      if (result.success) {
        toast({
          title: 'File deleted',
          description: 'The file has been deleted successfully',
        });
        
        // Remove from uploaded files list
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      } else {
        toast({
          title: 'Deletion failed',
          description: result.error || 'An unknown error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Deletion error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Google Cloud Storage Demo</CardTitle>
        <CardDescription>
          Upload and manage files using Google Cloud Storage
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Storage Status */}
        <Alert variant={status === 'configured' ? 'default' : 'destructive'}>
          <div className="flex items-center gap-2">
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'configured' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {status === 'loading' ? 'Checking status...' : 
               status === 'configured' ? 'Ready' : 'Configuration Required'}
            </AlertTitle>
          </div>
          <AlertDescription className="mt-2">
            {statusMessage}
          </AlertDescription>
        </Alert>

        {/* Upload Form */}
        {status === 'configured' && (
          <div className="space-y-4">
            <div className="grid w-full max-w-md items-center gap-1.5">
              <label htmlFor="file-upload" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Upload File
              </label>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Select a file to upload to Google Cloud Storage
              </p>
            </div>
            
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading || status !== 'configured'}
              className="w-full max-w-md"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Uploaded Files</h3>
            <div className="space-y-2">
              {uploadedFiles.map((uploadedFile, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-md">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="truncate">
                      <span className="font-medium">{uploadedFile.name}</span>
                      <p className="text-xs text-muted-foreground truncate">{uploadedFile.url}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(uploadedFile.url, '_blank')}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(uploadedFile.url, index)}
                      disabled={deleting === uploadedFile.url}
                    >
                      {deleting === uploadedFile.url ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          This demo shows how to use Google Cloud Storage for file storage
        </p>
      </CardFooter>
    </Card>
  );
}