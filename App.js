import React, { useEffect, useState } from 'react';
import { View, LogBox, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import * as Speech from 'expo-speech';
import * as Sensors from 'expo-sensors';
import { Audio } from 'expo-av';

// Ignore specific warnings that might appear due to dependencies
LogBox.ignoreLogs([
  'Possible Unhandled Promise Rejection',
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
  'Maximum call stack size exceeded',
]);

export default function App() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Request necessary permissions when app starts
  useEffect(() => {
    (async () => {
      try {
        // Request microphone permission for voice detection
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          // Check microphone permissions using Audio API
          let microphoneStatus = { granted: false };
          try {
            const audioPermission = await Audio.requestPermissionsAsync();
            microphoneStatus = audioPermission;
            console.log('Audio permission status:', audioPermission.status);
          } catch (error) {
            console.error('Error requesting audio permissions:', error);
          }
          
          // For Android, also request motion sensors permissions if needed
          let motionStatus = { granted: true }; // Default to true as most devices don't require explicit permission
          
          if (Platform.OS === 'android') {
            // Check if this device requires sensor permissions
            try {
              if (Sensors.hasOwnProperty('requestPermissionsAsync')) {
                motionStatus = await Sensors.requestPermissionsAsync();
              }
            } catch (error) {
              console.error('Error requesting sensor permissions:', error);
              motionStatus = { granted: false };
            }
            
            if (!motionStatus.granted) {
              Alert.alert(
                'Permissions Required',
                'This app needs access to motion sensors to detect emergencies.',
                [{ text: 'OK' }]
              );
              return;
            }
          }
          
          setPermissionsGranted(microphoneStatus.granted && motionStatus.granted);
          
          if (!microphoneStatus.granted) {
            Alert.alert(
              'Microphone Permission Required',
              'This app needs access to your microphone to detect emergency sounds.',
              [{ text: 'OK' }]
            );
          }
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
        Alert.alert(
          'Permission Error',
          'There was an error requesting permissions. Some features may not work properly.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <HomeScreen permissionsGranted={permissionsGranted} />
    </View>
  );
}
