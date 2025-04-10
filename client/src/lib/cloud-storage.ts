/**
 * Check the status of the Google Cloud Storage configuration
 * @returns A Promise resolving to the storage status
 */
export const checkCloudStorageStatus = async (): Promise<{
  isConfigured: boolean;
  bucketName: string;
  message?: string;
}> => {
  try {
    const response = await fetch('/api/cloud-storage/status');
    
    if (!response.ok) {
      throw new Error('Failed to check storage status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking cloud storage status:', error);
    return {
      isConfigured: false,
      bucketName: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Upload a file to the server using the /api/cloud-storage/upload endpoint
 * Files are now stored in the 'user-data' folder for better organization
 * @param file The file to upload
 * @returns A Promise resolving to the uploaded file data
 */
export const uploadFile = async (file: File): Promise<{ url: string; name: string; id: number }> => {
  try {
    // Create form data with the file
    const formData = new FormData();
    formData.append('file', file);
    
    // The server will automatically place user uploads in the 'user-data' folder
    // for proper organization and separation from other data types
    
    const response = await fetch('/api/cloud-storage/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload file');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Delete a file from Google Cloud Storage
 * @param url The URL of the file to delete
 * @returns A Promise resolving to the result of the delete operation
 */
export const deleteFile = async (url: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/cloud-storage/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete file');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Delete a folder and all its contents from Google Cloud Storage
 * @param folderPath The path of the folder to delete (e.g., 'repair_sessions/123')
 * @returns A Promise resolving to the result of the delete operation
 */
export const deleteFolder = async (folderPath: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/cloud-storage/delete-folder', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ folderPath }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete folder');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
};

/**
 * Fetch user data sync configuration
 * @returns A Promise resolving to the user's data sync preferences
 */
export const fetchDataSyncConfig = async (): Promise<{
  enabled: boolean;
  syncFrequency: string;
  lastSyncTime: string | null;
  syncRepairJourneys: boolean;
  syncDiagnosticData: boolean;
  syncRepairGuides: boolean;
  syncFileUploads: boolean;
}> => {
  try {
    const response = await fetch('/api/cloud-storage/config');
    
    if (!response.ok) {
      throw new Error('Failed to fetch data sync configuration');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching data sync configuration:', error);
    // Return default configuration if there's an error
    return {
      enabled: false,
      syncFrequency: 'real-time',
      lastSyncTime: null,
      syncRepairJourneys: true,
      syncDiagnosticData: true,
      syncRepairGuides: true,
      syncFileUploads: true
    };
  }
};

/**
 * Update user data sync configuration
 * @param config The updated sync configuration
 * @returns A Promise resolving to the updated configuration
 */
export const updateDataSyncConfig = async (config: {
  enabled: boolean;
  syncFrequency: string;
  syncRepairJourneys: boolean;
  syncDiagnosticData: boolean;
  syncRepairGuides: boolean;
  syncFileUploads: boolean;
}): Promise<{
  success: boolean;
  config: any;
  message?: string;
}> => {
  try {
    const response = await fetch('/api/cloud-storage/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update data sync configuration');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating data sync configuration:', error);
    throw error;
  }
};

/**
 * Trigger a manual sync of all data to Google Cloud Storage
 * @returns A Promise resolving to the sync result
 */
export const triggerManualSync = async (): Promise<{
  success: boolean;
  message: string;
  syncedItems?: number;
}> => {
  try {
    const response = await fetch('/api/cloud-storage/sync', {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to trigger manual sync');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    throw error;
  }
};

/**
 * Converts a file to base64 encoded string for sending to the server
 * @param file The file to convert
 * @returns A Promise resolving to the base64 encoded string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Converts a base64 encoded string back to a Blob object
 * @param base64 The base64 encoded string
 * @param contentType The content type of the file
 * @returns A Blob representation of the data
 */
export const base64ToBlob = (base64: string, contentType: string): Blob => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays: Uint8Array[] = [];
  
  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let j = 0; j < slice.length; j++) {
      byteNumbers[j] = slice.charCodeAt(j);
    }
    
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  
  return new Blob(byteArrays, { type: contentType });
};

/**
 * Creates a downloadable URL from a base64 encoded string
 * @param base64 The base64 encoded string
 * @param contentType The content type of the file
 * @returns A URL that can be used to download or display the file
 */
export const base64ToUrl = (base64: string, contentType: string): string => {
  const blob = base64ToBlob(base64, contentType);
  return URL.createObjectURL(blob);
};

/**
 * Calculate file size in KB or MB from a base64 string
 * @param base64 The base64 encoded string
 * @returns A formatted string showing the file size
 */
export const getBase64FileSize = (base64: string): string => {
  // Extract the base64 data part (after the comma)
  const base64Data = base64.split(',')[1] || base64;
  
  // Calculate size in bytes: each base64 character represents 6 bits, so 4 characters are 3 bytes
  const sizeInBytes = Math.floor((base64Data.length * 3) / 4);
  
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
};

/**
 * Fetch a list of repair session files from the server
 * @param sessionId The ID of the repair session
 * @returns Promise resolving to an array of file objects
 */
export const fetchRepairSessionFiles = async (sessionId: number) => {
  try {
    const response = await fetch(`/api/repair-sessions/${sessionId}/files`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch repair session files');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching repair session files:', error);
    throw error;
  }
};

/**
 * Upload a file to Google Cloud Storage via the server API
 * Files are now properly organized in folders based on their purpose
 * Repair session files are stored in the 'repair-session' folder
 * 
 * @param sessionId The ID of the repair session
 * @param file The file to upload
 * @param filePurpose The purpose of the file in the repair process
 * @param stepName Optional name of the repair step this file is associated with
 * @returns Promise resolving to the uploaded file data
 */
export const uploadFileToCloudStorage = async (
  sessionId: number,
  file: File,
  filePurpose: 'diagnostic_image' | 'repair_guide_image' | 'user_upload' | 'other',
  stepName?: string
) => {
  try {
    // Create a descriptive filename with metadata embedded
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    const fileExt = file.name.split('.').pop() || 'bin';
    const metadataFilename = `session_${sessionId}_${filePurpose}_${timestamp}_${randomId}.${fileExt}`;
    
    // Create form data with all necessary metadata
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', metadataFilename);
    formData.append('sessionId', sessionId.toString());
    formData.append('filePurpose', filePurpose);
    // This file will be placed in the repair-session folder automatically by the server
    
    if (stepName) {
      formData.append('stepName', stepName);
    }
    
    const response = await fetch('/api/cloud-storage/upload-session-file', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload file');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading file to cloud storage:', error);
    throw error;
  }
};