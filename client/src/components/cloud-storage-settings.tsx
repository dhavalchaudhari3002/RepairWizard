import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Progress 
} from "@/components/ui/progress";
import { 
  AlertCircle, 
  CheckCircle2, 
  Cloud, 
  CloudOff, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Upload 
} from 'lucide-react';
import { 
  checkCloudStorageStatus, 
  fetchDataSyncConfig, 
  updateDataSyncConfig, 
  triggerManualSync,
  uploadFile,
  deleteFile,
  deleteFolder
} from '../lib/cloud-storage';

export function CloudStorageSettings() {
  const { toast } = useToast();
  const [status, setStatus] = useState<{
    isConfigured: boolean;
    bucketName: string;
    message?: string;
  } | null>(null);
  
  const [syncConfig, setSyncConfig] = useState<{
    enabled: boolean;
    syncFrequency: string;
    lastSyncTime: string | null;
    syncRepairJourneys: boolean;
    syncDiagnosticData: boolean;
    syncRepairGuides: boolean;
    syncFileUploads: boolean;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  
  // File upload state
  const [uploadFolder, setUploadFolder] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Files list state
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  // Load cloud storage status
  useEffect(() => {
    async function loadStorageStatus() {
      setIsLoading(true);
      try {
        const result = await checkCloudStorageStatus();
        setStatus(result);
      } catch (error) {
        console.error('Failed to check cloud storage status:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadStorageStatus();
  }, []);
  
  // Load sync configuration
  useEffect(() => {
    async function loadSyncConfig() {
      if (!status?.isConfigured) return;
      
      try {
        const config = await fetchDataSyncConfig();
        setSyncConfig(config);
      } catch (error) {
        console.error('Failed to fetch sync configuration:', error);
      }
    }
    
    if (status) {
      loadSyncConfig();
    }
  }, [status]);
  
  // Load user files
  useEffect(() => {
    async function loadUserFiles() {
      if (!status?.isConfigured) return;
      
      setIsLoadingFiles(true);
      try {
        // This would typically fetch from your API
        // const files = await fetchUserFiles();
        setUserFiles([]); // Placeholder
      } catch (error) {
        console.error('Failed to fetch user files:', error);
      } finally {
        setIsLoadingFiles(false);
      }
    }
    
    if (status && activeTab === 'files') {
      loadUserFiles();
    }
  }, [status, activeTab]);
  
  // Handle sync configuration changes
  const handleSyncConfigChange = async (field: string, value: any) => {
    if (!syncConfig) return;
    
    const updatedConfig = {
      ...syncConfig,
      [field]: value
    };
    
    setSyncConfig(updatedConfig);
    
    try {
      const result = await updateDataSyncConfig(updatedConfig);
      
      if (result.success) {
        toast({
          title: 'Settings updated',
          description: 'Your cloud storage sync settings have been updated',
          variant: 'default'
        });
      } else {
        throw new Error(result.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving sync config:', error);
      toast({
        title: 'Settings update failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
      
      // Revert to previous state
      setSyncConfig(syncConfig);
    }
  };
  
  // Trigger manual sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await triggerManualSync();
      
      if (result.success) {
        toast({
          title: 'Sync completed',
          description: `Successfully synced ${result.syncedItems || 0} items to cloud storage`,
          variant: 'default'
        });
        
        // Refresh sync config to get the latest sync time
        const config = await fetchDataSyncConfig();
        setSyncConfig(config);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive'
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 20;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 300);
    
    try {
      const result = await uploadFile(selectedFile, uploadFolder || undefined);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast({
        title: 'File uploaded',
        description: `${result.name} has been uploaded to cloud storage`,
        variant: 'default'
      });
      
      // Clear form
      setSelectedFile(null);
      
      // Refresh files list if on the files tab
      if (activeTab === 'files') {
        // TODO: Implement files refresh
      }
      
      // Reset file input by clearing its value
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      
      console.error('File upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle file deletion
  const handleDeleteFile = async (url: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }
    
    try {
      const result = await deleteFile(url);
      
      if (result.success) {
        toast({
          title: 'File deleted',
          description: `${name} has been deleted from cloud storage`,
          variant: 'default'
        });
        
        // Remove file from the list
        setUserFiles(prevFiles => prevFiles.filter(file => file.url !== url));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('File deletion failed:', error);
      toast({
        title: 'Deletion failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  };
  
  // Render status indicator
  const renderStatusIndicator = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking storage connectivity...</span>
        </div>
      );
    }
    
    if (!status) {
      return (
        <div className="flex items-center space-x-2 text-amber-500">
          <AlertCircle className="h-4 w-4" />
          <span>Unable to check storage status</span>
        </div>
      );
    }
    
    if (!status.isConfigured) {
      return (
        <div className="flex items-center space-x-2 text-destructive">
          <CloudOff className="h-4 w-4" />
          <span>Cloud Storage is not configured</span>
          {status.message && <span className="text-xs">({status.message})</span>}
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 text-green-500">
        <CheckCircle2 className="h-4 w-4" />
        <span>Connected to bucket: {status.bucketName}</span>
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Cloud Storage Management</CardTitle>
            <CardDescription>Configure and manage Google Cloud Storage integration</CardDescription>
          </div>
          <div>
            {renderStatusIndicator()}
          </div>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          <TabsContent value="settings">
            {!status?.isConfigured ? (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4 my-4">
                <h3 className="text-amber-800 dark:text-amber-200 font-medium flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Cloud Storage Not Configured
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mt-2 text-sm">
                  Google Cloud Storage is not properly configured. Please ask your administrator
                  to set up the Google Cloud Storage integration.
                </p>
              </div>
            ) : syncConfig ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync-enable">Enable Cloud Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync repair data to Google Cloud Storage
                    </p>
                  </div>
                  <Switch
                    id="sync-enable"
                    checked={syncConfig.enabled}
                    onCheckedChange={value => handleSyncConfigChange('enabled', value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sync-frequency">Sync Frequency</Label>
                  <Select
                    value={syncConfig.syncFrequency}
                    onValueChange={value => handleSyncConfigChange('syncFrequency', value)}
                    disabled={!syncConfig.enabled}
                  >
                    <SelectTrigger id="sync-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real-time">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Data to Sync</Label>
                  <div className="grid gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sync-repair-journeys"
                        checked={syncConfig.syncRepairJourneys}
                        onCheckedChange={value => handleSyncConfigChange('syncRepairJourneys', value)}
                        disabled={!syncConfig.enabled}
                      />
                      <Label htmlFor="sync-repair-journeys" className="font-normal">
                        Repair Journeys
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sync-diagnostic-data"
                        checked={syncConfig.syncDiagnosticData}
                        onCheckedChange={value => handleSyncConfigChange('syncDiagnosticData', value)}
                        disabled={!syncConfig.enabled}
                      />
                      <Label htmlFor="sync-diagnostic-data" className="font-normal">
                        Diagnostic Data
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sync-repair-guides"
                        checked={syncConfig.syncRepairGuides}
                        onCheckedChange={value => handleSyncConfigChange('syncRepairGuides', value)}
                        disabled={!syncConfig.enabled}
                      />
                      <Label htmlFor="sync-repair-guides" className="font-normal">
                        Repair Guides
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sync-file-uploads"
                        checked={syncConfig.syncFileUploads}
                        onCheckedChange={value => handleSyncConfigChange('syncFileUploads', value)}
                        disabled={!syncConfig.enabled}
                      />
                      <Label htmlFor="sync-file-uploads" className="font-normal">
                        File Uploads
                      </Label>
                    </div>
                  </div>
                </div>
                
                {syncConfig.lastSyncTime && (
                  <div className="text-sm text-muted-foreground mt-4">
                    Last synced: {new Date(syncConfig.lastSyncTime).toLocaleString()}
                  </div>
                )}
                
                <div className="pt-4">
                  <Button
                    onClick={handleManualSync}
                    disabled={isSyncing || !status?.isConfigured}
                    className="w-full"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Manual Sync Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="files">
            {!status?.isConfigured ? (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4 my-4">
                <h3 className="text-amber-800 dark:text-amber-200 font-medium flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Cloud Storage Not Configured
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mt-2 text-sm">
                  Google Cloud Storage is not properly configured. Please ask your administrator
                  to set up the Google Cloud Storage integration.
                </p>
              </div>
            ) : isLoadingFiles ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : userFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Cloud className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <h3 className="text-lg font-medium">No files found</h3>
                <p className="text-sm">
                  You haven't uploaded any files to cloud storage yet.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('upload')}
                  className="mt-4"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Now
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {userFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.size}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteFile(file.url, file.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upload">
            {!status?.isConfigured ? (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4 my-4">
                <h3 className="text-amber-800 dark:text-amber-200 font-medium flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Cloud Storage Not Configured
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mt-2 text-sm">
                  Google Cloud Storage is not properly configured. Please ask your administrator
                  to set up the Google Cloud Storage integration.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folder">Folder (optional)</Label>
                  <Input
                    id="folder"
                    placeholder="e.g., documents/manuals"
                    value={uploadFolder}
                    onChange={e => setUploadFolder(e.target.value)}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to upload to the root folder
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
                
                {selectedFile && (
                  <div className="text-sm">
                    <p>Selected file: {selectedFile.name}</p>
                    <p>Size: {Math.round(selectedFile.size / 1024)} KB</p>
                  </div>
                )}
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                <Button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload to Cloud Storage
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="border-t bg-muted/50 px-6 py-3">
        <p className="text-xs text-muted-foreground">
          Files stored in Google Cloud Storage can be accessed by all users with the appropriate permissions.
        </p>
      </CardFooter>
    </Card>
  );
}

// Component for cleaning up duplicate folders
function FolderCleanupTool() {
  const { toast } = useToast();
  const [folderPath, setFolderPath] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDeleteFolder = async () => {
    if (!folderPath) {
      toast({
        title: 'Missing folder path',
        description: 'Please enter a folder path to delete',
        variant: 'destructive'
      });
      return;
    }
    
    // Confirm before deleting
    if (!window.confirm(`Are you sure you want to delete the folder "${folderPath}" and ALL its contents? This action cannot be undone!`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const result = await deleteFolder(folderPath);
      
      if (result.success) {
        toast({
          title: 'Folder deleted',
          description: `Successfully deleted folder: ${folderPath}`,
          variant: 'default'
        });
        setFolderPath(''); // Clear the input
      } else {
        throw new Error(result.message || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: 'Deletion failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="space-y-4 border border-border rounded-md p-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Delete Folder</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Use this tool to delete duplicate or unwanted folders from cloud storage.
          Be careful as this will delete all files within the folder.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="folder-path">Folder Path</Label>
        <div className="flex gap-2">
          <Input
            id="folder-path"
            placeholder="e.g., repair_sessions/113"
            value={folderPath}
            onChange={e => setFolderPath(e.target.value)}
            disabled={isDeleting}
          />
          <Button 
            variant="destructive" 
            size="sm"
            disabled={!folderPath || isDeleting}
            onClick={handleDeleteFolder}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter the full path to the folder (e.g. repair_sessions/113)
        </p>
      </div>
    </div>
  );
}