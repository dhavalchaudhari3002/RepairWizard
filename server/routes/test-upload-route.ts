// This file adds a test media upload route to the server

import { Express } from 'express';
import fs from 'fs';
import path from 'path';

export function addTestMediaUploadRoute(app: Express) {
  // Simple test page for media file uploads
  app.get('/test-media-upload', (req, res) => {
    const filePath = path.join(process.cwd(), 'test-media-upload.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error loading test media upload page:', err);
        res.status(500).send('Error loading test page');
        return;
      }
      
      res.setHeader('Content-Type', 'text/html');
      res.send(data);
    });
  });
}