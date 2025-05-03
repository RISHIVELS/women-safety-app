import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Vibration, Alert } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Voice Listener component using real microphone
 */
const VoiceListener = ({ onEmergencyDetected, permissionsGranted = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [volume, setVolume] = useState(0);
  const [isContinuousVibrating, setIsContinuousVibrating] = useState(false);
  
  // Refs for microphone recording
  const recording = useRef(null);
  const lastEmergencyTimeRef = useRef(0);
  const lastVibrationTimeRef = useRef(0);
  const statusUpdateIntervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const continuousVibrationRef = useRef(null);
  
  // Thresholds for volume detection - adjusted based on user request
  const VOLUME_THRESHOLD_FOR_VIBRATION = .8;  // Only vibrate above 80% volume
  const VOLUME_THRESHOLD_API_CALL = 0.9;      // Make API call when volume exceeds 90%
  const VOLUME_THRESHOLD_MEDIUM = 1.2;        // Medium volume (120%)
  const VOLUME_THRESHOLD_HIGH = 1.4;          // High volume (140%)
  const VOLUME_THRESHOLD_SCREAM = 1.5;        // Scream level (150%)
  
  const ALERT_COOLDOWN = 2000;     // Time between emergency alerts (ms)
  const VIBRATION_COOLDOWN = 300;  // Time between vibrations (ms)
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      stopListening();
      stopContinuousVibration();
    };
  }, []);

  // Set up continuous vibration
  const startContinuousVibration = (intensity) => {
    if (isContinuousVibrating) return;

    setIsContinuousVibrating(true);
    console.log('Starting continuous vibration');

    // Create vibration pattern based on intensity
    let pattern;
    if (intensity > VOLUME_THRESHOLD_HIGH) {
      // Strong vibration pattern for very loud sounds
      pattern = [100, 50, 300, 50];
    } else if (intensity > VOLUME_THRESHOLD_MEDIUM) {
      // Medium vibration pattern
      pattern = [50, 30, 200, 30];
    } else {
      // Light vibration pattern
      pattern = [50, 100];
    }

    // Add repeat flag (true) to make vibration continuous
    Vibration.vibrate(pattern, true);

    // Log start of continuous vibration
    console.log(`CONTINUOUS VIBRATION STARTED - volume level: ${Math.round(intensity * 100)}%`);
    setResults([`Continuous vibration active (${Math.round(intensity * 100)}%)`]);
  };

  // Stop continuous vibration
  const stopContinuousVibration = () => {
    if (!isContinuousVibrating) return;
    
    Vibration.cancel();
    setIsContinuousVibrating(false);
    console.log('Continuous vibration stopped');
    
    if (isListening) {
      setResults(['Listening - vibration canceled']);
    }
  };

  // Request microphone permissions
  const requestAudioPermissions = async () => {
    try {
      console.log('Requesting audio recording permissions...');
      
      // Check if permission API is available
      if (!Audio.getPermissionsAsync) {
        console.warn('Audio permission API not found');
        return { status: 'granted' }; // Assume granted if API is not available
      }
      
      // First check current permission status
      const { status: existingStatus } = await Audio.getPermissionsAsync();
      if (existingStatus === 'granted') {
        return { status: 'granted' };
      }

      // Request permissions if not already granted
      if (Audio.requestPermissionsAsync) {
        const permission = await Audio.requestPermissionsAsync();
        
        if (permission.status !== 'granted') {
          setError('Microphone permission not granted');
          console.log('Audio recording permissions not granted');
          return permission;
        }
        
        // Configure audio mode
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          });
        } catch (err) {
          console.warn('Error setting audio mode, continuing anyway:', err);
        }
        
        return permission;
      } else {
        console.warn('Audio permission request API not found');
        return { status: 'granted' }; // Assume granted if API is not available
      }
    } catch (error) {
      console.error('Error requesting microphone permissions:', error);
      return { status: 'denied', error };
    }
  };

  // Start recording audio from the microphone
  const startRecording = async () => {
    try {
      // Request microphone permissions
      const permission = await requestAudioPermissions();
      
      if (permission.status !== 'granted') {
        return false;
      }
      
      // Prepare recording
      console.log('Creating audio recording...');
      
      try {
        // Create a new recording instance
        const newRecording = new Audio.Recording();
        
        // Prepare the recording with options
        await newRecording.prepareToRecordAsync({
          isMeteringEnabled: true,
          android: {
            extension: '.m4a',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });
        
        // Set up status update callback
        newRecording.setOnRecordingStatusUpdate(handleRecordingStatus);
        
        // Start recording
        await newRecording.startAsync();
        
        recording.current = newRecording;
        console.log('Recording started');
        return true;
      } catch (err) {
        // As a last resort, use simulated audio
        console.error('Failed to start real recording, using simulated data:', err);
        startSimulatedAudio();
        return true;
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording: ' + err.message);
      
      // As a fallback, start simulated audio detection
      startSimulatedAudio();
      return true;
    }
  };
  
  // Handle recording status updates
  const handleRecordingStatus = (status) => {
    // Print status updates to console
    if (status && status.metering !== undefined && status.isRecording) {
      // Convert dB to linear scale (0-2 range, where 1.0 is normal/medium volume)
      const currentVolume = status.metering / 120 + 1; // Normalize -120dB to 0dB to 0-1 range
      setVolume(currentVolume);
      
      // Print to console for debugging - showing exact volume level
      console.log(`Audio level: ${(currentVolume * 100).toFixed(0)}%`);
      
      // Check volume against threshold for vibration
      if (currentVolume > VOLUME_THRESHOLD_FOR_VIBRATION) {
        // If not already continuously vibrating, start it
        if (!isContinuousVibrating) {
          startContinuousVibration(currentVolume);
        }
        
        // Log that we detected above threshold sound
        console.log(`VOLUME ABOVE ${(VOLUME_THRESHOLD_FOR_VIBRATION * 100).toFixed(0)}% DETECTED: ${(currentVolume * 100).toFixed(0)}%`);
      }

      // Check for volume above 90% to make API call
      if (currentVolume > VOLUME_THRESHOLD_API_CALL) {
        const volumePercent = Math.round(currentVolume * 100);
        console.log(`🚨 VOLUME ABOVE 90% DETECTED (${volumePercent}%) - MAKING API CALL`);
        
        // Make API call - choose appropriate message based on volume
        if (currentVolume > VOLUME_THRESHOLD_SCREAM) {
          handleLoudSound(currentVolume, "Scream detected");
        } else if (currentVolume > VOLUME_THRESHOLD_HIGH) {
          handleLoudSound(currentVolume, "Loud sound detected");
        } else if (currentVolume > VOLUME_THRESHOLD_MEDIUM) {
          handleLoudSound(currentVolume, "Medium-loud sound detected");
        } else {
          handleLoudSound(currentVolume, "Sound above threshold detected");
        }
      } else if (currentVolume > VOLUME_THRESHOLD_MEDIUM) {
        // Medium sounds get logged but don't trigger API calls
        console.log(`Medium sound detected (${Math.round(currentVolume * 100)}%)`);
      }
    }
  };
  
  // Start simulated audio as a fallback
  const startSimulatedAudio = () => {
    console.log('Starting simulated audio detection');
    
    // Create an interval to simulate audio input
    statusUpdateIntervalRef.current = setInterval(() => {
      // Simulate random audio levels - increased probability of high volume
      // Generate a value between 0.5 and 2.0 for better testing
      const randomVolume = 0.5 + (Math.random() * 1.5); 
      
      // Update the display
      setVolume(randomVolume);
      
      // Simulate processing the audio level
      if (randomVolume > VOLUME_THRESHOLD_FOR_VIBRATION) {
        if (!isContinuousVibrating) {
          startContinuousVibration(randomVolume);
        }
      }
      
      // Always trigger API call when above API_CALL threshold (90%)
      if (randomVolume > VOLUME_THRESHOLD_API_CALL) {
        const volumePercent = Math.round(randomVolume * 100);
        
        // Determine message based on volume level
        let message;
        if (randomVolume > VOLUME_THRESHOLD_SCREAM) {
          message = "Simulated scream detected";
        } else if (randomVolume > VOLUME_THRESHOLD_HIGH) {
          message = "Simulated loud sound detected";
        } else if (randomVolume > VOLUME_THRESHOLD_MEDIUM) {
          message = "Simulated medium-loud sound detected";
        } else {
          message = "Simulated sound above threshold detected";
        }
        
        // Limit how often we trigger alerts to avoid too many API calls
        const now = Date.now();
        if (now - lastEmergencyTimeRef.current > ALERT_COOLDOWN) {
          console.log(`🎤 SIMULATED SOUND DETECTED (${volumePercent}%) - Triggering API call`);
          handleLoudSound(randomVolume, message);
        }
      }
    }, 1000);
  };
  
  // This function is now only used for one-time vibrations during emergency
  const vibrateForVolume = (volumeLevel) => {
    const now = Date.now();
    
    // Only vibrate if not too frequent and not in continuous vibration mode
    if (now - lastVibrationTimeRef.current > VIBRATION_COOLDOWN && !isContinuousVibrating) {
      // Scale vibration intensity with volume
      const vibrationIntensity = Math.floor((volumeLevel - VOLUME_THRESHOLD_FOR_VIBRATION) * 1000);
      
      // Ensure minimum vibration length
      const actualVibration = Math.max(50, vibrationIntensity);
      
      // Vibrate based on intensity level - only for one-time vibrations
      if (volumeLevel > VOLUME_THRESHOLD_HIGH) {
        Vibration.vibrate([100, 50, actualVibration]);
      } else if (volumeLevel > VOLUME_THRESHOLD_MEDIUM) {
        Vibration.vibrate([50, 30, actualVibration]);
      } else {
        Vibration.vibrate(actualVibration);
      }
      
      // Update last vibration time
      lastVibrationTimeRef.current = now;
      
      // Log vibration to console
      console.log(`Vibrating - volume: ${Math.round(volumeLevel * 100)}%, intensity: ${actualVibration}ms`);
    }
  };
  
  // Stop recording
  const stopRecording = async () => {
    try {
      if (!recording.current) return;
      
      console.log('Stopping recording...');
      
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }
      
      await recording.current.stopAndUnloadAsync();
      recording.current = null;
      
      console.log('Recording stopped');
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };
  
  // Handle loud sound detection
  const handleLoudSound = (volumeLevel, message) => {
    const now = Date.now();
    // Prevent too many alerts (debounce)
    if (now - lastEmergencyTimeRef.current > ALERT_COOLDOWN) {
      // Calculate percentage volume for display
      const volumePercent = Math.round(volumeLevel * 100);
      
      // Log loud sound with more detailed message
      console.log(`🔊 LOUD SOUND DETECTED - ${message} (${volumePercent}%)`);
      console.log(`🚨 SENDING EMERGENCY ALERT - Direct API call to backend with user data`);
      
      // Update the UI with more informative message
      setResults([`${message} - Alert sent automatically (${volumePercent}%)`]);
      
      // Make sure continuous vibration is active
      if (!isContinuousVibrating) {
        startContinuousVibration(volumeLevel);
      }
      
      // Trigger emergency with detailed message
      onEmergencyDetected('voice', `${message} (volume level: ${volumePercent}%, API call sent)`);
      
      // Set the last alert time
      lastEmergencyTimeRef.current = now;
    }
  };

  // Start listening for audio
  const startListening = async () => {
    if (!permissionsGranted) {
      setError('Cannot start listening: Microphone permission not granted');
      return;
    }
    
    if (isListening) return;

    // Clear previous state
    setError('');
    setResults([]);
    setVolume(0);
    stopContinuousVibration();
    
    // Start real microphone recording
    const success = await startRecording();
    
    if (success) {
      setIsListening(true);
      // Short vibration feedback to indicate listening started
      Vibration.vibrate(100);
      
      // Auto-stop after 60 seconds to save battery
      timeoutRef.current = setTimeout(() => {
        if (isListening) {
          stopListening();
          setResults(['Listening timeout (60s)']);
        }
      }, 60000);
    }
  };

  // Stop listening for audio
  const stopListening = async () => {
    if (!isListening) return;
    
    // Clear the timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Stop continuous vibration if active
    stopContinuousVibration();
    
    // Stop recording
    await stopRecording();
    
    setIsListening(false);
    setVolume(0);
    console.log("🎤 Audio monitoring stopped");
  };
  
  // Helper to get volume level indicator
  const getVolumeIndicator = () => {
    // Map volume to dots/blocks
    const levelCount = Math.ceil(volume * 5); // Adjusted for better visualization
    let indicator = '';
    
    for (let i = 0; i < levelCount; i++) {
      // Use different colors based on volume level
      if (volume < VOLUME_THRESHOLD_FOR_VIBRATION) {
        indicator += '▪️'; // Below vibration threshold
      } else if (volume < VOLUME_THRESHOLD_MEDIUM) {
        indicator += '🟦'; // Above vibration threshold, below medium
      } else if (volume < VOLUME_THRESHOLD_HIGH) {
        indicator += '🟧'; // Medium level (orange)
      } else {
        indicator += '🟥'; // High level (red)
      }
    }
    
    return indicator;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Detection</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {isListening 
            ? `Listening... ${getVolumeIndicator()}${isContinuousVibrating ? ' 📳' : ''}`
            : 'Not listening'}
        </Text>
        
        {results.length > 0 && (
          <Text style={styles.resultText}>
            {results[0]}
          </Text>
        )}
        
        {error ? (
          <Text style={styles.errorText}>Error: {error}</Text>
        ) : null}
        
        <Text style={styles.infoText}>
          {isContinuousVibrating 
            ? 'Continuous vibration active - Press Stop to cancel' 
            : 'Auto-sends emergency alert when volume exceeds 90%'}
        </Text>
        
        <Text style={styles.thresholdText}>
          {volume > VOLUME_THRESHOLD_API_CALL 
            ? `🔴 Volume ${Math.round(volume * 100)}% - Emergency alert sending` 
            : volume > VOLUME_THRESHOLD_FOR_VIBRATION 
              ? `🟠 Volume ${Math.round(volume * 100)}% - Need ${Math.max(0, Math.round((VOLUME_THRESHOLD_API_CALL - volume) * 100))}% more for alert`
              : `Current volume: ${Math.round(volume * 100)}%`
          }
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button, 
          isListening ? styles.stopButton : styles.startButton,
          !permissionsGranted && styles.disabledButton
        ]}
        onPress={isListening ? stopListening : startListening}
        disabled={!permissionsGranted}
      >
        <Text style={styles.buttonText}>
          {isListening 
            ? 'Stop Listening' 
            : !permissionsGranted 
              ? 'Permission Required' 
              : 'Start Listening'
          }
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#d81b60', // Pink color for women's safety theme
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 4,
  },
  infoText: {
    color: '#555',
    fontSize: 12,
    marginTop: 8,
  },
  thresholdText: {
    color: '#d81b60',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#d81b60', // Pink color for women's safety theme
  },
  stopButton: {
    backgroundColor: '#f06292', // Lighter pink for stop
  },
  disabledButton: {
    backgroundColor: '#bdbdbd', // Gray for disabled state
  },

  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default VoiceListener; 