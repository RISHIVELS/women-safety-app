import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import VoiceListener from '../components/VoiceListener';
import MotionDetector from '../components/MotionDetector';
import EmergencyAlertManager from '../components/EmergencyAlertManager';
import ContactsManager from '../components/ContactsManager';
import NameInputModal from '../components/NameInputModal';
import { useUser } from '../context/UserContext';

const HomeScreen = ({ 
  navigation,
  permissionsGranted = false, 
  microphonePermission = false, 
  motionPermission = false 
}) => {
  // Reference to the EmergencyAlertManager component using useRef instead of useState
  const alertManagerRef = useRef(null);
  const { userName, location, isLoading } = useUser();
  const [showNameModal, setShowNameModal] = useState(false);

  // Check if we need to show the name input modal
  useEffect(() => {
    if (!isLoading && !userName) {
      setShowNameModal(true);
    }
  }, [isLoading, userName]);

  // Handle closing the name modal
  const handleCloseNameModal = () => {
    setShowNameModal(false);
  };

  // Handler for emergencies detected by components
  const handleEmergency = useCallback((type, details) => {
    console.log(`Emergency detected - Type: ${type}, Details: ${details}`);
    
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

  // Navigate to map screen
  const goToMap = () => {
    navigation.navigate('Map');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Name input modal */}
      <NameInputModal visible={showNameModal} onClose={handleCloseNameModal} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          {userName ? (
            <Text style={styles.welcomeText}>Welcome, {userName}</Text>
          ) : (
            <Text style={styles.welcomeText}>Welcome to SafeGuard</Text>
          )}
          <Text style={styles.infoText}>
            This app uses your phone's sensors to detect potential emergency situations
            and can alert you when danger is detected.
          </Text>
          
          {!permissionsGranted && (
            <View style={styles.permissionWarning}>
              <Text style={styles.permissionWarningText}>
                ⚠️ Permission(s) not granted. Some features may be limited.
                Emergency detection will still work when motion is severe.
              </Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.mapButton} onPress={goToMap}>
            <Text style={styles.mapButtonText}>View My Location on Map</Text>
          </TouchableOpacity>
        </View>

        {/* Main detection modules */}
        <VoiceListener 
          onEmergencyDetected={handleEmergency} 
          permissionsGranted={microphonePermission} 
        />
        <MotionDetector 
          onEmergencyDetected={handleEmergency}
          permissionsGranted={motionPermission}
        />

        {/* Emergency alert handling */}
        <EmergencyAlertManager 
          ref={alertManagerRef}
        />
        
        {/* Emergency contacts management */}
        <ContactsManager />

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            Safety protection active for severe motion even without permissions.
            Add emergency contacts to send SMS alerts automatically.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d81b60',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  permissionWarning: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  permissionWarningText: {
    color: '#e65100',
    fontSize: 14,
  },
  mapButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginTop: 16,
    alignItems: 'center',
  },
  mapButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#d81b60',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default HomeScreen; 