import React, { useState, useCallback, useRef } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Header from '../components/Header';
import VoiceListener from '../components/VoiceListener';
import MotionDetector from '../components/MotionDetector';
import EmergencyAlertManager from '../components/EmergencyAlertManager';

const HomeScreen = ({ permissionsGranted = false }) => {
  // Reference to the EmergencyAlertManager component using useRef instead of useState
  const alertManagerRef = useRef(null);
  // Reference to the VoiceListener for controlling vibration
  const voiceListenerRef = useRef(null);

  // Handler for emergencies detected by components
  const handleEmergency = useCallback((type, details) => {
    console.log(`Emergency detected - Type: ${type}, Details: ${details}`);
    
    // Start continuous vibration without asking permission when motion emergency is detected
    if (type === 'motion' && voiceListenerRef.current) {
      // Check if it contains rapid rotation
      if (details.includes('rotation')) {
        console.log('Rapid rotation detected - starting continuous vibration immediately');
        voiceListenerRef.current.startContinuousVibration(2.0); // High intensity vibration
      } else if (details.includes('Severe movement')) {
        console.log('Severe movement detected - starting continuous vibration immediately');
        voiceListenerRef.current.startContinuousVibration(1.7); // Medium-high intensity
      }
    }
    
    // Forward to alert manager if available
    if (alertManagerRef.current && alertManagerRef.current.handleEmergency) {
      alertManagerRef.current.handleEmergency(type, details);
    } else {
      // Fallback if reference not available
      Alert.alert(
        'Emergency Detected',
        `Type: ${type}\nDetails: ${details}`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header title="Women Safety App" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Emergency Detection</Text>
        
        {/* Voice Listener Component */}
        <VoiceListener 
          ref={voiceListenerRef}
          onEmergencyDetected={handleEmergency} 
          permissionsGranted={permissionsGranted}
        />
        
        {/* Motion Detector Component */}
        <MotionDetector 
          onEmergencyDetected={handleEmergency}
          permissionsGranted={permissionsGranted}
        />
        
        {/* Emergency Alert Manager */}
        <EmergencyAlertManager 
          ref={alertManagerRef}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
});

export default HomeScreen; 