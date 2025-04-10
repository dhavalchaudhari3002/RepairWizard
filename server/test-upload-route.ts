// This file adds a test upload route to the server

import { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { googleCloudStorage } from './services/google-cloud-storage';

export function addTestUploadRoute(app: Express) {
  // Simple test page for file uploads
  app.get('/test-upload', (req, res) => {
    const filePath = path.join(process.cwd(), 'test-upload-demo.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error loading test page:', err);
        res.status(500).send('Error loading test page');
        return;
      }
      
      res.setHeader('Content-Type', 'text/html');
      res.send(data);
    });
  });
}