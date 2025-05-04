import React, { useEffect, useState } from 'react';
import { View, LogBox, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import * as Sensors from 'expo-sensors';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import AppNavigator from './src/navigation/AppNavigator';
import { UserProvider } from './src/context/UserContext';
import { EmergencyProvider } from './src/context/EmergencyContext';

// Ignore specific warnings that might appear due to dependencies
LogBox.ignoreLogs([
  'Possible Unhandled Promise Rejection',
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
  'Maximum call stack size exceeded',
]);

export default function App() {
  const [permissions, setPermissions] = useState({
    microphone: false,
    motion: false,
    camera: false
  });

  // Request necessary permissions when app starts
  useEffect(() => {
    (async () => {
      try {
        // Initialize permission status
        const permissionStatus = {
          microphone: false,
          motion: false,
          camera: false
        };
        
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          // Check microphone permissions using Audio API
          try {
            const audioPermission = await Audio.requestPermissionsAsync();
            permissionStatus.microphone = audioPermission.granted;
            console.log('Audio permission status:', audioPermission.status);
            
            if (!audioPermission.granted) {
              Alert.alert(
                'Microphone Permission Required',
                'Voice detection requires microphone access. Motion detection will still work for emergencies.',
                [{ text: 'OK' }]
              );
            }
          } catch (error) {
            console.error('Error requesting audio permissions:', error);
          }
          
          // For Android, also request motion sensors permissions if needed
          permissionStatus.motion = true; // Default to true as most devices don't require explicit permission
          
          if (Platform.OS === 'android') {
            // Check if this device requires sensor permissions
            try {
              if (Sensors.hasOwnProperty('requestPermissionsAsync')) {
                const motionPermission = await Sensors.requestPermissionsAsync();
                permissionStatus.motion = motionPermission.granted;
                
                if (!motionPermission.granted) {
                  Alert.alert(
                    'Motion Sensors Limited',
                    'Full motion detection requires sensor permissions. Emergency detection will still work for severe motion.',
                    [{ text: 'OK' }]
                  );
                }
              }
            } catch (error) {
              console.error('Error requesting sensor permissions:', error);
            }
          }
          
          // Request camera permissions
          try {
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            permissionStatus.camera = cameraPermission.status === 'granted';
            console.log('Camera permission status:', cameraPermission.status);
            
            if (cameraPermission.status !== 'granted') {
              Alert.alert(
                'Camera Permission Required',
                'The emergency camera feature requires access to your camera to automatically capture photos during an emergency.',
                [{ text: 'OK' }]
              );
            }
          } catch (error) {
            console.error('Error requesting camera permissions:', error);
          }
          
          // Update permissions state
          setPermissions(permissionStatus);
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
        Alert.alert(
          'Permission Error',
          'There was an error requesting permissions. Emergency detection will still work.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  // Calculate overall permissions status
  const arePermissionsGranted = permissions.microphone || permissions.motion;

  return (
    <UserProvider>
      <EmergencyProvider>
        <View style={{ flex: 1 }}>
          <StatusBar style="light" />
          <AppNavigator
            permissionsGranted={arePermissionsGranted} 
            microphonePermission={permissions.microphone}
            motionPermission={permissions.motion}
            cameraPermission={permissions.camera}
          />
        </View>
      </EmergencyProvider>
    </UserProvider>
  );
}
