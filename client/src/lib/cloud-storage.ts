/**
 * Converts a file to base64 encoded string for sending to the server
 * @param file The file to convert
 * @returns A Promise resolving to the base64 encoded string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // The result includes the data URL prefix (e.g., "data:image/png;base64,")
        // We need to strip this prefix for backend processing
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
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
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
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
  const sizeInBytes = (base64.length * 3) / 4;
  if (sizeInBytes < 1024) {
    return `${Math.round(sizeInBytes)} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${Math.round(sizeInBytes / 1024)} KB`;
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
    const response = await fetch(`/api/repair-journey/${sessionId}/files`);
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching repair session files:', error);
    return [];
  }
};

/**
 * Upload a file to Google Cloud Storage via the server API
 * @param sessionId The ID of the repair session
 * @param file The file to upload
 * @param filePurpose The purpose of the file in the repair process
 * @param stepName Optional name of the repair step this file is associated with
 * @returns Promise resolving to the uploaded file data
 */
export const uploadFileToCloudStorage = async (
  sessionId: number,
  file: File,
  filePurpose: string,
  stepName?: string
) => {
  try {
    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    const response = await fetch(`/api/repair-journey/${sessionId}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64Data,
        contentType: file.type,
        fileName: file.name,
        filePurpose,
        stepName: stepName || undefined,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload file');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading file to cloud storage:', error);
    throw error;
  }
};