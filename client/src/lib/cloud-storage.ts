/**
 * Google Cloud Storage API integration
 * Handles file uploads and management
 */

interface CloudStorageStatus {
  status: 'configured' | 'not_configured' | 'error';
  message: string;
  error?: string;
}

interface UploadFileOptions {
  contentType: string;
  fileName?: string;
  folder?: string;
}

interface UploadFileResponse {
  success: boolean;
  url?: string;
  message: string;
  error?: string;
}

interface DeleteFileResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Check if Google Cloud Storage is properly configured
 */
export async function checkCloudStorageStatus(): Promise<CloudStorageStatus> {
  try {
    const response = await fetch('/api/cloud-storage/status');
    if (!response.ok) {
      const errorData = await response.json();
      return {
        status: 'error',
        message: errorData.message || 'Failed to check Cloud Storage status',
        error: errorData.error
      };
    }
    return await response.json();
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to connect to the Cloud Storage service',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Upload a file to Google Cloud Storage
 * @param file - The file to upload (either File object or base64 string)
 * @param options - Upload options
 */
export async function uploadFile(
  file: File | string,
  options: UploadFileOptions
): Promise<UploadFileResponse> {
  try {
    // Check if the input is a File object or a base64 string
    let fileData: string;
    let contentType = options.contentType;
    
    if (typeof file === 'string') {
      // It's already a base64 string or data URL
      fileData = file;
    } else {
      // Convert File to base64
      fileData = await fileToBase64(file);
      // If content type wasn't specified, use the file's type
      if (!contentType) {
        contentType = file.type;
      }
    }
    
    const response = await fetch('/api/cloud-storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: fileData,
        contentType,
        fileName: options.fileName,
        folder: options.folder
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.error || 'Failed to upload file',
        error: errorData.details || 'Unknown error'
      };
    }
    
    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: 'Failed to upload file',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Delete a file from Google Cloud Storage
 * @param url - The URL of the file to delete
 */
export async function deleteFile(url: string): Promise<DeleteFileResponse> {
  try {
    const response = await fetch('/api/cloud-storage/files', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.error || 'Failed to delete file',
        error: errorData.details || 'Unknown error'
      };
    }
    
    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: 'Failed to delete file',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Convert a File object to base64 string
 * @param file - The file to convert
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Convert a base64 string to a File object
 * @param base64 - The base64 string to convert
 * @param filename - The name for the new file
 * @param contentType - The content type of the file
 */
export function base64ToFile(
  base64: string,
  filename: string,
  contentType: string
): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || contentType;
  const bstr = atob(arr[arr.length - 1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}