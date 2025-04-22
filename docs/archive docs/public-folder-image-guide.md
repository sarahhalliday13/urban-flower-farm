# Using the Public Folder for Plant Shop Images

The simplest solution for hosting plant images is to store them directly in your React app's public folder. This approach requires no external services and ensures reliable, fast image loading.

## Setting Up Images in the Public Folder

### Step 1: Organize Your Images
1. In your React project, navigate to the `public/images` folder
2. Create subfolders if needed (e.g., `public/images/plants`)
3. Use consistent naming for your image files (e.g., `lavender-mist.jpg`)

### Step 2: Add Images to the Folder
1. Copy your optimized plant images to the `public/images/plants` folder
2. Make sure filenames don't have spaces (use hyphens instead)
3. Use lowercase filenames for consistency

### Step 3: Reference Images in the Google Sheet
1. Open your plant inventory spreadsheet
2. In the "plants" sheet, find the `mainImage` column
3. Add the relative path to each image: `/images/plants/lavender-mist.jpg`
4. For additional images, add multiple paths separated by commas

### Step 4: Deploy Your Changes
1. Commit and push your changes to GitHub
2. Netlify will automatically deploy the updated images

## Advantages of Using the Public Folder
- Fastest possible loading times (served directly with your app)
- No external dependencies or services needed
- No flashing or loading issues
- Complete control over your images
- No rate limits or bandwidth concerns

## Image Best Practices

1. **Image Optimization**:
   - Resize images to around 800-1200px wide before adding them
   - Use JPG format for photos (smaller file size)
   - Keep file sizes under 500KB for faster loading
   - Consider using a tool like [Squoosh](https://squoosh.app/) to optimize images

2. **Organization**:
   - Use consistent naming conventions
   - Consider organizing by plant type or category in subfolders

3. **Multiple Images**:
   - Store all images for a plant in the same folder
   - Reference them in the `additionalImages` column with comma-separated paths:
     ```
     /images/plants/lavender-1.jpg,/images/plants/lavender-2.jpg
     ```

4. **Replacing Images**:
   - Simply replace the file in the public folder with the new image
   - Keep the same filename to avoid updating the spreadsheet
   - Deploy your changes

## Limitations

1. **Requires Developer Access**: Adding new images requires access to the codebase and ability to deploy changes
2. **Repository Size**: Large numbers of images can make the Git repository larger
3. **No On-the-fly Transformations**: Unlike Cloudinary, you can't resize or transform images via URL parameters

## Example

Image paths to use in the spreadsheet:

For main image:
```
/images/plants/lavender-mist.jpg
```

For multiple images:
```
/images/plants/lavender-mist-1.jpg,/images/plants/lavender-mist-2.jpg
``` 