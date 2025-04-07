import React from 'react';
import { CloudStorageDemo } from '@/components/cloud-storage-demo';

export function CloudStoragePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Google Cloud Storage</h1>
        <p className="text-muted-foreground">
          Upload, store, and manage files securely with Google Cloud Storage
        </p>
      </div>
      
      <div className="grid gap-8 mb-8">
        <CloudStorageDemo />
      </div>
      
      <div className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">About Google Cloud Storage</h2>
        <div className="prose dark:prose-invert">
          <p>
            Google Cloud Storage is a unified object storage service for developers and enterprises. 
            It's ideal for storing and serving user-generated content, data backup, and archival storage.
          </p>
          
          <h3>Key features:</h3>
          <ul>
            <li><strong>Scalable storage</strong> - Store any amount of data with no minimum object size</li>
            <li><strong>High durability</strong> - Industry-leading 99.999999999% (11 9's) annual durability</li>
            <li><strong>Global access</strong> - Access your data from anywhere in the world</li>
            <li><strong>Security</strong> - Protect your data with encryption, access controls, and audit logging</li>
          </ul>
          
          <h3>When to use Google Cloud Storage:</h3>
          <ul>
            <li>Storing user-uploaded files (images, documents, videos)</li>
            <li>Serving static content for websites and applications</li>
            <li>Data backup and archiving</li>
            <li>Data lakes for analytics</li>
          </ul>
          
          <p>
            In this demo, we've integrated Google Cloud Storage with our repair assistant 
            platform to provide secure and reliable storage for repair images, documentation, 
            and other files that users may need to share or access during the repair process.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CloudStoragePage;