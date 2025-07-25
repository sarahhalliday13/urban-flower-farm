# Using Imgur for Plant Shop Images

Imgur is a free image hosting service that's optimized for web display and works reliably with websites. Here's how to use it for your plant shop images.

## Setting Up Imgur for Plant Images

### Step 1: Create an Imgur Account
1. Go to [Imgur](https://imgur.com)
2. Click "Sign Up" in the top-right corner
3. Create an account (you can use email or sign in with Google/Facebook/Apple)

### Step 2: Upload Images
1. Click the "New Post" button at the top
2. Drag and drop images or click to browse your files
3. Use descriptive titles for your uploads
4. You can upload multiple images at once

### Step 3: Get Direct Image Links
1. After uploading, you'll see your images in a post
2. Right-click on an image
3. Select "Copy Image Address" or "Copy Image Link"
4. The link will look like: `https://i.imgur.com/abCD123.jpg`

### Step 4: Update the Google Sheet
1. Open your plant inventory spreadsheet
2. In the "plants" sheet, find the `mainImage` column
3. Paste the direct Imgur link for each plant
4. For additional images, add the direct links to the `additionalImages` column, separated by commas

## Advantages of Imgur
- Fast loading times (optimized for web display)
- No flashing or loading issues
- Free to use
- No account needed to view images
- Reliable and stable

## Image Best Practices

1. **Image Optimization**:
   - Resize images to around 800-1200px wide before uploading
   - Use JPG format for photos (smaller file size)
   - Keep file sizes under 500KB for faster loading

2. **Organization**:
   - You can create albums in Imgur to organize your plant images
   - Use consistent naming for easy reference

3. **Multiple Images**:
   - Upload all images for a plant
   - Copy each direct image link
   - Add them to the `additionalImages` column in the spreadsheet, separated by commas

4. **Replacing Images**:
   - Upload the new image
   - Get the new direct link
   - Update the spreadsheet

## Troubleshooting

If images don't appear on the website:
1. Make sure you're using the direct image link (starts with `https://i.imgur.com/`)
2. Check that the image hasn't been deleted from Imgur
3. Try opening the link in an incognito browser window to test
4. Refresh the data in the Inventory Manager

## Example

Direct Imgur link to use in the spreadsheet:
```
https://i.imgur.com/abCD123.jpg
```

For multiple images:
```
https://i.imgur.com/abCD123.jpg,https://i.imgur.com/efGH456.jpg
``` 