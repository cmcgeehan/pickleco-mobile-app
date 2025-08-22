// Quick script to fix auth issues by clearing stored tokens
// Run this if you're getting "Invalid Refresh Token" errors

// For React Native/Expo, you can run this in the Metro console
// Or add it temporarily to your app and call it

const fixAuth = async () => {
  try {
    console.log('🔧 Fixing auth issues...');
    
    // Import AsyncStorage 
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Clear all Supabase related storage keys
    const keysToRemove = [
      'sb-localhost-auth-token',
      'supabase.auth.token', 
      'sb-auth-token',
      '@supabase/auth-token',
      'supabase.session'
    ];
    
    // Try to remove each key
    for (const key of keysToRemove) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`✅ Removed: ${key}`);
      } catch (error) {
        console.log(`⚠️ Could not remove: ${key}`);
      }
    }
    
    // Clear all keys that might contain auth tokens
    const allKeys = await AsyncStorage.getAllKeys();
    const authKeys = allKeys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session') ||
      key.includes('token')
    );
    
    for (const key of authKeys) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`🧹 Cleared auth key: ${key}`);
      } catch (error) {
        console.log(`⚠️ Could not clear: ${key}`);
      }
    }
    
    console.log('✅ Auth cleanup complete! Restart the app.');
    
  } catch (error) {
    console.error('❌ Error fixing auth:', error);
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fixAuth };
}

// Auto-run if this script is executed directly
if (typeof window === 'undefined' && require.main === module) {
  fixAuth();
}

console.log('🔧 Auth fix script loaded. Call fixAuth() to clear stored tokens.');