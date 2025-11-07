// Utility function to construct proper image URL
// Handles both local file paths and Cloudinary URLs

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const getImageUrl = (photoUrl: string | null | undefined): string => {
  if (!photoUrl) return '';
  
  // If photoUrl already includes the full URL (Cloudinary or other external URLs), return as is
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
  
  // Construct the full URL for local files
  return `${BACKEND_URL}/${cleanPath}`;
};

