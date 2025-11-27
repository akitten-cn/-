import { UploadedImage, StitchResult } from '../types';

/**
 * Loads a file into an HTMLImageElement to get dimensions and raw data.
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // URL.revokeObjectURL(url); // Keep alive for drawing
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Reads a file as a DataURL string (Base64).
 */
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Main function to stitch images vertically.
 */
export const stitchImages = async (uploadedImages: UploadedImage[]): Promise<StitchResult> => {
  if (uploadedImages.length === 0) {
    throw new Error("No images to stitch");
  }

  // 1. Load all images to valid HTMLImageElements
  const loadedImages = await Promise.all(uploadedImages.map(u => loadImage(u.file)));
  
  // 2. Calculate dimensions
  // Strategy: Scale everything to the width of the FIRST image to maintain consistency.
  // This is typical for "screenshot stitching".
  const targetWidth = loadedImages[0].naturalWidth;
  
  let totalHeight = 0;
  
  // Calculate total height needed based on scaled dimensions
  const imageDrawData = loadedImages.map(img => {
    const scaleFactor = targetWidth / img.naturalWidth;
    const scaledHeight = img.naturalHeight * scaleFactor;
    totalHeight += scaledHeight;
    return {
      img,
      scaledHeight,
      scaleFactor
    };
  });

  // 3. Create Canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Could not get canvas context");

  // Fill white background (optional, prevents transparency issues)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. Draw images
  let currentY = 0;
  imageDrawData.forEach(({ img, scaledHeight }) => {
    ctx.drawImage(img, 0, currentY, targetWidth, scaledHeight);
    currentY += scaledHeight;
  });

  // 5. Get Data URL (JPEG, Quality 1.0)
  // We use JPEG because EXIF is typically supported in JPEG. 
  // Piexifjs works with JPEG DataURLs.
  const stitchedDataUrl = canvas.toDataURL("image/jpeg", 1.0);

  // 6. Handle EXIF
  let finalDataUrl = stitchedDataUrl;
  
  try {
    // Read the first image to get its EXIF
    const firstImageDataUrl = await readFileAsDataURL(uploadedImages[0].file);
    
    // Check if window.piexif exists (loaded via CDN in index.html)
    if (window.piexif) {
      try {
        // Attempt to load EXIF from the first image
        const exifObj = window.piexif.load(firstImageDataUrl);
        
        // If EXIF exists, inject it into the new image
        // '0th', 'Exif', 'GPS', 'Interop', '1st' are keys in exifObj
        // We verify if it's not empty string which piexif returns for no exif
        if (typeof exifObj === 'object') {
             // Sometimes load returns "null" string representation for empty
             const exifBytes = window.piexif.dump(exifObj);
             finalDataUrl = window.piexif.insert(exifBytes, stitchedDataUrl);
             console.log("EXIF data successfully transferred.");
        }
      } catch (exifError) {
        console.warn("Could not extract or insert EXIF data (image might be PNG or have no EXIF):", exifError);
        // Fallback: Just use the stitched image without EXIF
      }
    } else {
      console.warn("Piexifjs not found. EXIF data will not be preserved.");
    }
  } catch (err) {
    console.error("Error handling EXIF:", err);
  }

  // 7. Convert to Blob for download url
  const res = await fetch(finalDataUrl);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  // Cleanup
  loadedImages.forEach(img => URL.revokeObjectURL(img.src));

  return {
    blob,
    url,
    width: targetWidth,
    height: Math.round(totalHeight)
  };
};