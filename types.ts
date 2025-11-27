export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

export interface StitchResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

// Declaration for the global piexif object loaded via CDN
declare global {
  interface Window {
    piexif: any;
  }
}
