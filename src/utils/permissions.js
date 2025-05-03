import { Alert, Platform } from 'react-native';

/**
 * Request multiple permissions at once
 * @param {Array} permissionsArray - Array of permission types to request
 * @returns {Object} Object with status of each permission
 */
export const requestPermissions = async (permissionsArray) => {
  try {
    // Request all permissions at once
    const results = {};
    
    for (const permission of permissionsArray) {
      const { status } = await Permissions.askAsync(permission);
      results[permission] = status === 'granted';
      
      // If permission is denied, show an alert with instructions
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          `This app needs ${permission} permission to function properly. Please enable it in your device settings.`,
          [{ text: 'OK' }]
        );
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return {};
  }
};

/**
 * Check if all required permissions are granted
 * @param {Array} permissionsArray - Array of permission types to check
 * @returns {Promise<boolean>} True if all permissions are granted
 */
export const checkPermissions = async (permissionsArray) => {
  try {
    for (const permission of permissionsArray) {
      const { status } = await Permissions.getAsync(permission);
      if (status !== 'granted') {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

/**
 * Mock implementation of microphone permission request
 * In a real app, we would use the proper permission APIs
 * @returns {Promise<boolean>} Always returns true for demonstration
 */
export const requestMicrophonePermission = async () => {
  console.log('Requesting microphone permission (mock implementation)');
  // For demo purposes, always return true
  return true;
};

/**
 * Mock implementation of motion sensor permissions
 * Most devices don't require explicit permission for motion/orientation sensors
 * @returns {Promise<boolean>} Always returns true
 */
export const requestMotionPermissions = async () => {
  // iOS and Android don't typically require explicit permission for accelerometer/gyroscope
  return true;
}; 