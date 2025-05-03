import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { getEmergencyContacts } from '../components/ContactsManager';

// Function to get current location
const getCurrentLocation = async () => {
  try {
    // Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }
    
    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return location;
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

// Function to send SMS to emergency contacts
export const sendEmergencySMS = async (emergencyType, details) => {
  try {
    // Get emergency contacts
    const contacts = await getEmergencyContacts();
    
    if (!contacts || contacts.length === 0) {
      console.log('No emergency contacts found');
      return false;
    }
    
    // Try to get current location
    const location = await getCurrentLocation();
    
    // Prepare message
    let message = `EMERGENCY ALERT: ${emergencyType} detected. ${details || ''}`;
    
    // Add location information if available
    if (location) {
      const { latitude, longitude } = location.coords;
      const googleMapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      message += `\n\nCurrent location: ${googleMapsUrl}`;
    } else {
      message += '\n\nLocation unavailable';
    }
    
    // Send SMS to each contact
    for (const contact of contacts) {
      await sendSMS(contact.phone, message);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending emergency SMS:', error);
    return false;
  }
};

// Function to send SMS using platform-specific methods
const sendSMS = async (phoneNumber, message) => {
  try {
    // Remove any spaces, dashes, or parentheses from the phone number
    const cleanedPhoneNumber = phoneNumber.replace(/[\s()-]/g, '');
    
    // Create SMS URI
    let smsUri;
    
    if (Platform.OS === 'android') {
      smsUri = `sms:${cleanedPhoneNumber}?body=${encodeURIComponent(message)}`;
    } else {
      // iOS uses different format
      smsUri = `sms:${cleanedPhoneNumber}&body=${encodeURIComponent(message)}`;
    }
    
    // Check if Linking can open the SMS URI
    const canOpen = await Linking.canOpenURL(smsUri);
    
    if (!canOpen) {
      console.log('Cannot open SMS app');
      return false;
    }
    
    // Open SMS app with pre-filled message
    await Linking.openURL(smsUri);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

// Function to test SMS sending
export const testSendSMS = async () => {
  // Get emergency contacts
  const contacts = await getEmergencyContacts();
  
  if (!contacts || contacts.length === 0) {
    Alert.alert(
      'No Contacts',
      'Please add emergency contacts first',
      [{ text: 'OK' }]
    );
    return false;
  }
  
  // Confirm before testing
  Alert.alert(
    'Test Emergency SMS',
    `This will send a test SMS to ${contacts.length} emergency contact(s). Continue?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Send Test', 
        onPress: () => sendEmergencySMS('TEST', 'This is a test emergency alert. No action needed.') 
      }
    ]
  );
};

// Function to send current location to emergency contacts
export const sendLocationToContacts = async () => {
  try {
    // Get emergency contacts
    const contacts = await getEmergencyContacts();
    
    if (!contacts || contacts.length === 0) {
      Alert.alert(
        'No Contacts',
        'Please add emergency contacts first',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    // Try to get current location
    const location = await getCurrentLocation();
    
    if (!location) {
      Alert.alert(
        'Location Unavailable',
        'Could not determine your current location. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    // Prepare message
    const { latitude, longitude } = location.coords;
    const googleMapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    const message = `Current location: ${googleMapsUrl}`;
    
    // Confirm before sending
    Alert.alert(
      'Share Location',
      `Send your current location to ${contacts.length} emergency contact(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: async () => {
            // Send SMS to each contact
            for (const contact of contacts) {
              await sendSMS(contact.phone, message);
            }
            
            Alert.alert(
              'Location Shared',
              'Your location has been shared with your emergency contacts',
              [{ text: 'OK' }]
            );
          } 
        }
      ]
    );
    
    return true;
  } catch (error) {
    console.error('Error sending location:', error);
    Alert.alert(
      'Error',
      'Failed to share location',
      [{ text: 'OK' }]
    );
    return false;
  }
}; 