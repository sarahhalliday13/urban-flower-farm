# Google Drive Image Hosting Example

This document shows how to use Google Drive for hosting plant images.

## Step-by-Step Example

### 1. Original Google Drive Sharing Link

When you share an image from Google Drive, you get a link like this:

```
https://drive.google.com/file/d/1ABCdefGHIjklMNOpqrsTUVwxYZ/view?usp=sharing
```

### 2. Extract the File ID

The File ID is the part between `/d/` and `/view`:

```
1ABCdefGHIjklMNOpqrsTUVwxYZ
```

### 3. Create the Direct Image URL

Format the direct URL like this:

```
https://drive.google.com/uc?export=view&id=1ABCdefGHIjklMNOpqrsTUVwxYZ
```

### 4. Use in the Google Sheet

In your plant inventory spreadsheet, use this direct URL in the `mainImage` column.

## Multiple Images Example

If a plant has multiple images, you'll need to:

1. Upload each image to Google Drive
2. Get the direct URL for each image
3. Add them to the `additionalImages` column in the spreadsheet, separated by commas

Example:

```
https://drive.google.com/uc?export=view&id=1ABCdefGHIjklMNOpqrsTUVwxYZ,https://drive.google.com/uc?export=view&id=2DEFghiJKLmnoPQRstUVwxYZ
```

## Testing Your Image URLs

To test if your direct image URL works:

1. Open a new browser tab
2. Paste the direct URL
3. The image should load directly without any Google Drive interface

If the image doesn't load, check that:
- The image is shared with "Anyone with the link"
- The File ID is correct
- You're using the correct URL format 