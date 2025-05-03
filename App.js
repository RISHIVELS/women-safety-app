import React, { useEffect, useState } from 'react';
import { View, LogBox, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import * as Sensors from 'expo-sensors';
import { Audio } from 'expo-av';
import AppNavigator from './src/navigation/AppNavigator';
import { UserProvider } from './src/context/UserContext';

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
    motion: false
  });

  // Request necessary permissions when app starts
  useEffect(() => {
    (async () => {
      try {
        // Initialize permission status
        const permissionStatus = {
          microphone: false,
          motion: false
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
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AppNavigator
          permissionsGranted={arePermissionsGranted} 
          microphonePermission={permissions.microphone}
          motionPermission={permissions.motion}
        />
      </View>
    </UserProvider>
  );
}
