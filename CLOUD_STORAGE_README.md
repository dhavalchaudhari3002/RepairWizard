# Google Cloud Storage Integration Guide

## Flat File Storage Architecture

This application uses a flat storage architecture for Google Cloud Storage. All files are stored directly in the bucket root with descriptive filenames that include identifiers (like session IDs) and timestamps to ensure uniqueness.

### Important Architecture Notes

1. **No Folder Structures**: Files are stored directly in the bucket root without any folder hierarchies.
2. **Descriptive Filenames**: Instead of using folders to organize data, we use descriptive filenames that include:
   - Session IDs (e.g., `session_9999_...`)
   - Data types (e.g., `diagnostic_`, `repair_guide_`)
   - Timestamps to ensure uniqueness

### Filename Patterns

- Session data: `session_[ID]_[type]_[timestamp].json`
- Repair data: `repair_session_[ID]_[timestamp].json`
- Complete session: `complete_session_[ID]_[timestamp].json`
- User uploads: `user_upload_[ID]_[timestamp].[extension]`

## Implementation Details

Our Google Cloud Storage service has been modified to:

1. **Ignore Folder Parameters**: Any folder parameters passed to the storage methods are ignored
2. **Remove Path Segments**: Path segments in filenames are automatically removed
3. **Use Descriptive Naming**: All methods generate descriptive filenames with identifiers and timestamps
4. **Maintain API Compatibility**: Legacy folder-related methods still exist but do not create actual folders

## For Developers

### ⚠️ Important Usage Notes

- **Never include folder paths** in filenames when uploading
- Use the `customName` parameter to provide descriptive filenames
- If using the web UI, treat the "folder" field as a filename prefix, not an actual folder path
- If you see any folder structures in Google Cloud Storage console, they may be remnants and can be manually deleted

### Usage Examples

```typescript
// CORRECT: Use descriptive filename without folders
await googleCloudStorage.uploadFile(fileBuffer, {
  customName: `session_${sessionId}_diagnostic_${Date.now()}.json`,
  contentType: 'application/json'
});

// INCORRECT: Don't use folder paths
await googleCloudStorage.uploadFile(fileBuffer, {
  folder: `sessions/${sessionId}/diagnostics`,  // This will be ignored
  customName: 'data.json',                     
  contentType: 'application/json'
});
```

## Cleanup Notes

If you observe any folder structures in the Google Cloud Storage console (e.g., a "test/" folder), these may be remnants from previous versions of the application. These folders do not affect the functionality of the application as all new files are guaranteed to be stored directly in the bucket root.

To remove these remnant folders:

1. Use the Google Cloud Storage console to delete the folders manually
2. Run the provided cleanup script: `node cleanup-test-folder.cjs`
3. Alternatively, you may need to use the `gsutil` command line tool if the console UI doesn't allow deletion