# User Profile Image Feature Documentation

This document describes the user profile image upload, change, and removal feature implemented in the mobile app, intended to enable the web app team to implement the same functionality.

---

## Overview

The profile image feature allows authenticated users to:
1. **Upload** a new profile photo (from camera or photo library)
2. **Change** their existing profile photo
3. **View** their profile photo or initials as a fallback

Profile images are stored in Supabase Storage and served via public URLs.

---

## Technical Architecture

### Storage Configuration

| Property | Value |
|----------|-------|
| **Storage Provider** | Supabase Storage |
| **Bucket Name** | `user-images` |
| **Bucket Visibility** | Public (read access for all) |
| **File Size Limit** | None (unlimited) |
| **Allowed MIME Types** | All image types (jpg, jpeg, png, webp) |

### File Naming Convention

Files are stored using a simple naming pattern:

```
{userId}.{extension}
```

**Examples:**
- `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`
- `a1b2c3d4-e5f6-7890-abcd-ef1234567890.png`

This approach:
- Uses `upsert: true` to overwrite existing images when a user uploads a new one
- Eliminates the need to track or delete old filenames
- Simplifies lookup (just check for common extensions)

### Public URL Format

```
https://omqdrgqzlksexruickvh.supabase.co/storage/v1/object/public/user-images/{userId}.{extension}
```

---

## API Reference

### Upload Image

**Method:** Direct Supabase Storage SDK upload

```typescript
const { data, error } = await supabase.storage
  .from('user-images')
  .upload(fileName, binaryData, {
    contentType: `image/${fileExtension}`,
    upsert: true,  // Overwrite existing file
  });
```

**Parameters:**
- `fileName`: `{userId}.{extension}` (e.g., `abc123.jpg`)
- `binaryData`: `Uint8Array` of the image data
- `contentType`: MIME type (e.g., `image/jpeg`, `image/png`)
- `upsert`: `true` to allow replacing existing images

**Response:**
```typescript
{
  success: boolean;
  url?: string;      // Public URL on success
  error?: string;    // Error message on failure
}
```

### Get User Avatar URL

To retrieve a user's avatar, check for the existence of common image extensions:

```typescript
async function getUserAvatarUrl(userId: string): Promise<string | null> {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  const bucketName = 'user-images';

  for (const ext of extensions) {
    const fileName = `${userId}.${ext}`;
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', { search: fileName });

    if (!error && data && data.length > 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
    }
  }

  return null; // No avatar found
}
```

### Delete User Image

```typescript
const { error } = await supabase.storage
  .from('user-images')
  .remove([fileName]);  // e.g., ['abc123.jpg']
```

---

## Supabase RLS Policies

The following Row Level Security policies must be configured on the `storage.objects` table:

```sql
-- 1. Allow authenticated users to upload files named with their user ID
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'user-images'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '.%')
);

-- 2. Allow users to update (overwrite) their own files
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'user-images'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '.%')
)
WITH CHECK (
    bucket_id = 'user-images'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '.%')
);

-- 3. Allow users to delete their own files
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'user-images'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '.%')
);

-- 4. Allow public read access to all avatars
CREATE POLICY "Public can read user-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-images');
```

---

## UI/UX Flow

### Mobile Implementation Flow

1. **Display Current Avatar**
   - On component mount, call `getUserAvatarUrl(userId)`
   - If URL exists, display the image
   - If no URL, display user initials as fallback (first letter of first name + first letter of last name)

2. **Trigger Upload**
   - User taps on their avatar
   - Present action sheet with options:
     - "Take Photo" (camera)
     - "Choose from Library" (photo picker)
     - "Cancel"

3. **Image Selection**
   - Request appropriate permissions (camera or media library)
   - Open camera or image picker
   - Allow cropping to 1:1 aspect ratio
   - Compress to 80% quality

4. **Upload Process**
   - Show loading indicator over avatar
   - Convert image to base64, then to `Uint8Array`
   - Upload to Supabase Storage with `upsert: true`
   - On success, refresh avatar URL and display new image
   - On error, show alert with error message

5. **Image Display**
   - Use circular crop (border-radius: 50%)
   - Size: 56x56px on mobile, recommend 80x80px on web
   - Camera icon overlay in bottom-right corner

### Visual Design Specifications

```
Avatar Container:
- Width: 56px (mobile) / 80px (web recommended)
- Height: 56px (mobile) / 80px (web recommended)
- Border radius: 50%
- Background (no image): #2A62A2 (brand blue)

Initials Fallback:
- Font size: 20px (mobile) / 28px (web)
- Font weight: bold
- Color: #ffffff

Camera Icon Overlay:
- Position: absolute, bottom-right
- Size: 20px x 20px
- Background: #ffffff
- Border: 1px solid #E2E8F0
- Border radius: 50%

Loading Overlay:
- Background: rgba(42, 98, 162, 0.8)
- Spinner: white, centered
```

---

## Web Implementation Guide

### Required Dependencies

```bash
npm install @supabase/supabase-js
```

### Recommended Component Structure

```typescript
// components/ProfileAvatar.tsx

interface ProfileAvatarProps {
  userId: string;
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onImageUpdate?: (url: string) => void;
}

export function ProfileAvatar({
  userId,
  firstName,
  lastName,
  size = 'md',
  editable = true,
  onImageUpdate,
}: ProfileAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load avatar on mount
  useEffect(() => {
    loadAvatar();
  }, [userId]);

  const loadAvatar = async () => {
    const url = await getUserAvatarUrl(userId);
    setAvatarUrl(url);
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadUserImage(file, userId);
      if (result.success && result.url) {
        setAvatarUrl(result.url);
        onImageUpdate?.(result.url);
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="relative">
      <div
        className={`rounded-full overflow-hidden bg-brand-blue flex items-center justify-center ${sizeClasses[size]}`}
        onClick={() => editable && fileInputRef.current?.click()}
        style={{ cursor: editable ? 'pointer' : 'default' }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-bold">{initials}</span>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-brand-blue/80 flex items-center justify-center">
            <Spinner className="text-white" />
          </div>
        )}
      </div>

      {editable && (
        <>
          <button
            className="absolute bottom-0 right-0 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <CameraIcon className="w-3 h-3" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </>
      )}
    </div>
  );
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};
```

### Upload Function for Web

```typescript
// lib/imageUploadService.ts

export async function uploadUserImage(
  file: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}.${fileExtension}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('user-images')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Construct public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/user-images/${fileName}`;

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
```

---

## Image Processing Recommendations

### On the Client Side

1. **Resize before upload** - Resize large images to max 500x500px to reduce upload time and storage
2. **Compress** - Use 80% JPEG quality or WebP format for smaller file sizes
3. **Square crop** - Enforce 1:1 aspect ratio for consistent display

### Libraries for Web

- **Browser Image Compression**: `browser-image-compression`
- **Cropping**: `react-image-crop` or `react-cropper`

Example with compression:

```typescript
import imageCompression from 'browser-image-compression';

async function processImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 500,
    useWebWorker: true,
  };

  return await imageCompression(file, options);
}
```

---

## Caching Strategy

The mobile app uses an in-memory cache with 24-hour expiration. For web, consider:

1. **Browser cache** - Set appropriate `Cache-Control` headers on Supabase
2. **SWR/React Query** - Cache avatar URLs with stale-while-revalidate
3. **Cache busting** - Append timestamp query param when image is updated:
   ```typescript
   const urlWithCacheBust = `${avatarUrl}?t=${Date.now()}`;
   ```

---

## Error Handling

| Error Case | User Message | Action |
|------------|--------------|--------|
| Not authenticated | "Please sign in to change your photo" | Redirect to login |
| File too large | "Image must be less than 5MB" | Show file size limit |
| Invalid file type | "Please select an image file" | Validate on selection |
| Upload failed | "Failed to upload image. Please try again." | Allow retry |
| Network error | "Network error. Check your connection." | Show retry button |
| Permission denied | "Storage permission required" | Link to settings |

---

## Security Considerations

1. **Authentication required** - All uploads require a valid Supabase session
2. **User isolation** - RLS policies ensure users can only modify their own files
3. **File validation** - Validate MIME type on both client and server
4. **Size limits** - Implement max file size to prevent abuse
5. **Public read access** - Avatar URLs are publicly accessible (intentional for profile display)

---

## Related Files (Mobile App)

| File | Purpose |
|------|---------|
| `lib/imageUploadService.ts` | Core upload/download logic |
| `lib/imageCache.tsx` | Caching utilities |
| `screens/MoreScreen.tsx` | Avatar UI and upload triggers |
| `storage_policy_summary.md` | Supabase storage configuration |

---

## Testing Checklist

- [ ] Upload new image (from file picker)
- [ ] Replace existing image (verify old image is gone)
- [ ] Display initials fallback when no image exists
- [ ] Show loading state during upload
- [ ] Handle upload errors gracefully
- [ ] Verify RLS prevents unauthorized uploads
- [ ] Test with various image formats (jpg, png, webp)
- [ ] Test with large images (should be resized/compressed)
- [ ] Verify cache invalidation after upload
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
