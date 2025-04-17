# Plant Image Management Guide

This guide explains how to manage plant images for the Buttons Urban Flower Farm website using Google Drive.

## Setting Up Google Drive for Plant Images

### Step 1: Create a Dedicated Folder
1. Go to [Google Drive](https://drive.google.com)
2. Click the "+ New" button
3. Select "Folder"
4. Name it "Plant Shop Images" or something similar
5. Click "Create"

### Step 2: Upload Images
1. Open the new folder
2. Drag and drop images or click "+ New" → "File upload"
3. Use descriptive filenames (e.g., "lavender-mist.jpg")
4. Wait for uploads to complete

### Step 3: Make Images Accessible
1. Right-click on an image
2. Select "Share"
3. Change the setting to "Anyone with the link"
4. Click "Done"
5. (Optional) You can also right-click the folder and share the entire folder this way

### Step 4: Get Direct Image Links
For each image:
1. Right-click the image
2. Select "Share"
3. Copy the link
4. The link will look like: `https://drive.google.com/file/d/1ABCdefGHIjklMNOpqrsTUVwxYZ/view?usp=sharing`
5. Extract the file ID (the part between `/d/` and `/view`)
6. Create a direct link using this format: `https://drive.google.com/uc?export=view&id=YOUR_FILE_ID`

### Step 5: Update the Google Sheet
1. Open your plant inventory spreadsheet
2. In the "plants" sheet, find the `mainImage` column
3. Paste the direct link for each plant
4. For additional images, add the direct links to the `additionalImages` column, separated by commas

## Image Best Practices

1. **Image Optimization**:
   - Resize images to around 800-1200px wide before uploading
   - Use JPG format for photos (smaller file size)
   - Keep file sizes under 500KB for faster loading

2. **Naming Convention**:
   - Use consistent naming (e.g., "plant-name.jpg")
   - Avoid spaces and special characters in filenames

3. **Multiple Images**:
   - For additional images, follow the same process
   - Add the direct links to the `additionalImages` column in the spreadsheet, separated by commas

4. **Replacing Images**:
   - Upload the new image with a different name
   - Get the new direct link
   - Update the spreadsheet
   - The old image can be deleted from Google Drive

## Troubleshooting

If images don't appear on the website:
1. Check that they're properly shared (Anyone with the link)
2. Verify the direct link format is correct
3. Try opening the direct link in an incognito browser window to test
4. Refresh the data in the Inventory Manager

## Example

Original Google Drive link:
```
https://drive.google.com/file/d/1ABCdefGHIjklMNOpqrsTUVwxYZ/view?usp=sharing
```

File ID:
```
1ABCdefGHIjklMNOpqrsTUVwxYZ
```

Direct link to use in the spreadsheet:
```
https://drive.google.com/uc?export=view&id=1ABCdefGHIjklMNOpqrsTUVwxYZ
``` 