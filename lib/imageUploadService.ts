import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

// Debug: Log what's available in ImagePicker
console.log('ImagePicker available properties:', Object.keys(ImagePicker));
console.log('MediaTypeOptions:', ImagePicker.MediaTypeOptions);
console.log('MediaType:', (ImagePicker as any).MediaType);

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

class ImageUploadService {
  private bucketName = 'user-images';

  // Request permissions
  async requestPermissions(needsCamera: boolean = true): Promise<boolean> {
    try {
      // Always request media library permissions
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission:', mediaLibraryPermission.status);
      
      if (mediaLibraryPermission.status !== 'granted') {
        console.log('Media library permission not granted');
        return false;
      }

      // Only request camera permissions if needed
      if (needsCamera) {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        console.log('Camera permission:', cameraPermission.status);
        
        if (cameraPermission.status !== 'granted') {
          console.log('Camera permission not granted');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // Show image picker options
  async pickImage(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermissions = await this.requestPermissions(false); // Only need media library for picking
      if (!hasPermissions) {
        throw new Error('Media library permission is required');
      }

      return await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 1, // 1 is the value for Images
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for avatars
        quality: 0.8,
        base64: false,
      });
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  // Take photo with camera
  async takePhoto(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermissions = await this.requestPermissions(true); // Need both camera and media library
      if (!hasPermissions) {
        throw new Error('Camera permission is required');
      }

      return await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 1, // 1 is the value for Images
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for avatars
        quality: 0.8,
        base64: false,
      });
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  }

  // Upload image to Supabase storage
  async uploadUserImage(
    uri: string, 
    firstName: string, 
    lastName: string,
    userId: string
  ): Promise<ImageUploadResult> {
    try {
      // Get file extension from URI
      const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Create filename: userId.extension (much simpler!)
      const fileName = `${userId}.${fileExtension}`;
      
      // Read the file as binary data
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to upload images');
      }

      // Upload to Supabase storage with user context
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, byteArray, {
          contentType: `image/${fileExtension}`,
          upsert: true, // Overwrite if exists
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      // Construct the public URL
      const publicUrl = `${supabase.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${fileName}`;

      console.log('Image uploaded successfully to:', publicUrl);

      return {
        success: true,
        url: publicUrl,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Get user's avatar URL (checks for common image extensions)
  async getUserAvatarUrl(userId: string): Promise<string | null> {
    try {
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      for (const ext of extensions) {
        const fileName = `${userId}.${ext}`;
        const { data, error } = await supabase.storage
          .from(this.bucketName)
          .list('', {
            search: fileName
          });

        if (!error && data && data.length > 0) {
          return `${supabase.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${fileName}`;
        }
      }
      
      return null; // No avatar found
    } catch (error) {
      console.error('Error getting user avatar URL:', error);
      return null;
    }
  }

  // Delete user image from storage
  async deleteUserImage(fileName: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) {
        console.error('Error deleting image:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteUserImage:', error);
      return false;
    }
  }
}

export const imageUploadService = new ImageUploadService();