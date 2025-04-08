import React from 'react';
import { CloudStorageSettings } from '../components/cloud-storage-settings';
import { 
  Cloud, 
  Database, 
  HardDrive, 
  Shield, 
  Zap 
} from 'lucide-react';

export function CloudStoragePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Google Cloud Storage Integration
          </h1>
          <p className="text-xl text-muted-foreground">
            Manage your repair data synced to Google Cloud Storage
          </p>
        </header>
        
        <div className="grid gap-8">
          <CloudStorageSettings />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Data Redundancy</h3>
                  <p className="text-muted-foreground">
                    All your repair journey data is automatically backed up to Google Cloud Storage,
                    ensuring your important information is never lost.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Enterprise Security</h3>
                  <p className="text-muted-foreground">
                    Your data is protected with industry-leading security measures provided by
                    Google Cloud Platform's infrastructure.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Real-time Sync</h3>
                  <p className="text-muted-foreground">
                    Choose between real-time synchronization or scheduled backups to optimize
                    for your specific performance and data protection needs.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <HardDrive className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Structured Storage</h3>
                  <p className="text-muted-foreground">
                    All repair data is organized in a structured format that facilitates future
                    machine learning and analytics applications.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-muted p-6 rounded-lg border">
            <div className="flex items-start space-x-4">
              <Cloud className="h-8 w-8 text-primary mt-1" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Why use Google Cloud Storage?</h2>
                <p className="text-muted-foreground mb-4">
                  Google Cloud Storage provides enterprise-grade durability and availability for your repair data.
                  By synchronizing your repair journeys to the cloud, you ensure:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Complete backup of all diagnostic data, issues, and repair guides</li>
                  <li>Secure storage of images and files uploaded during repair journeys</li>
                  <li>Structured organization of data for future AI training and analytics</li>
                  <li>Ability to access your repair data from anywhere, anytime</li>
                  <li>Protection against data loss due to local infrastructure failures</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}