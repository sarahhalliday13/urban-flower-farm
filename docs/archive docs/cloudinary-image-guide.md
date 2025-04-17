# Using Cloudinary for Plant Shop Images

Cloudinary is a powerful image hosting service with a generous free tier that's specifically designed for web applications. It offers excellent performance and reliability.

## Setting Up Cloudinary for Plant Images

### Step 1: Create a Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com/users/register/free)
2. Sign up for a free account
3. After signing up, you'll get your cloud name (e.g., `democloud`)

### Step 2: Upload Images
1. Log in to your Cloudinary dashboard
2. Click the "Media Library" tab
3. Click "Upload" button
4. Drag and drop images or click to browse your files
5. You can create folders to organize your plant images

### Step 3: Get Direct Image Links
1. After uploading, click on an image in your Media Library
2. In the details panel, find the "Copy URL" button
3. The link will look like: `https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/filename.jpg`
4. You can also use the "Share" button and select "Copy URL"

### Step 4: Update the Google Sheet
1. Open your plant inventory spreadsheet
2. In the "plants" sheet, find the `mainImage` column
3. Paste the Cloudinary link for each plant
4. For additional images, add the links to the `additionalImages` column, separated by commas

## Advantages of Cloudinary
- Extremely fast loading (global CDN)
- Automatic image optimization
- Responsive images (different sizes for different devices)
- Free tier with generous limits (25GB storage, 25GB monthly bandwidth)
- Very reliable and stable

## Image Transformations (Advanced)
Cloudinary allows you to transform images on-the-fly by modifying the URL:

1. **Resize an image to 500px wide**:
   ```
   https://res.cloudinary.com/your-cloud-name/image/upload/w_500/filename.jpg
   ```

2. **Crop to a square**:
   ```
   https://res.cloudinary.com/your-cloud-name/image/upload/w_500,h_500,c_fill/filename.jpg
   ```

3. **Optimize quality**:
   ```
   https://res.cloudinary.com/your-cloud-name/image/upload/q_auto/filename.jpg
   ```

## Image Best Practices

1. **Organization**:
   - Create folders in Cloudinary for different plant categories
   - Use consistent naming for easy reference

2. **Multiple Images**:
   - Upload all images for a plant
   - Copy each direct image link
   - Add them to the `additionalImages` column in the spreadsheet, separated by commas

3. **Replacing Images**:
   - You can either:
     - Upload a new image with a new name
     - Or replace an existing image while keeping the same name (the URL stays the same)

## Troubleshooting

If images don't appear on the website:
1. Check that you're using the correct Cloudinary URL
2. Verify your Cloudinary account is active
3. Make sure you haven't exceeded the free tier limits
4. Try opening the link in an incognito browser window to test

## Example

Direct Cloudinary link to use in the spreadsheet:
```
https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/plants/lavender.jpg
```

For multiple images with optimization:
```
https://res.cloudinary.com/your-cloud-name/image/upload/q_auto/plants/lavender1.jpg,https://res.cloudinary.com/your-cloud-name/image/upload/q_auto/plants/lavender2.jpg
``` 