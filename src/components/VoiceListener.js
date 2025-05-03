import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Voice Listener component using real microphone
 */
const VoiceListener = forwardRef(({ onEmergencyDetected, permissionsGranted = false }, ref) => {
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
  const VOLUME_THRESHOLD_FOR_VIBRATION = 1; // Only vibrate above 110% volume
  const VOLUME_THRESHOLD_MEDIUM = 1.3;        // Medium volume (130%)
  const VOLUME_THRESHOLD_HIGH = 1.5;          // High volume (150%)
  const VOLUME_THRESHOLD_SCREAM = 1.7;        // Scream level (170%)
  
  const ALERT_COOLDOWN = 2000;     // Time between emergency alerts (ms)
  const VIBRATION_COOLDOWN = 300;  // Time between vibrations (ms)

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    // Allow external components to trigger continuous vibration
    startContinuousVibration: (intensity) => {
      startContinuousVibration(intensity || 1.5);
    },
    stopContinuousVibration: () => {
      stopContinuousVibration();
    },
    isVibrating: () => {
      return isContinuousVibrating;
    }
  }));

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
    console.log('Starting continuous vibration - triggered ' + 
      (intensity ? `with intensity ${Math.round(intensity * 100)}%` : 'externally'));

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
    setResults(['Continuous vibration active' + 
      (intensity ? ` (${Math.round(intensity * 100)}%)` : '')]);
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

  // Start recording audio from the microphone
  const startRecording = async () => {
    try {
      // Request microphone permissions
      console.log('Requesting audio recording permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        setError('Microphone permission not granted');
        console.log('Audio recording permissions not granted');
        return false;
      }
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      
      // Prepare recording
      console.log('Creating audio recording...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true,  // Enable volume metering
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.MEDIUM,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        },
        // Callback for status updates
        (status) => {
          // Print status updates to console
          if (status.metering && status.isRecording) {
            // Convert dB to linear scale (0-2 range, where 1.0 is normal/medium volume)
            const currentVolume = status.metering / 120 + 1; // Normalize -120dB to 0dB to 0-1 range
            setVolume(currentVolume);
            
            // Print to console for debugging - showing exact volume level
            console.log(`hello (volume level: ${(currentVolume * 100).toFixed(0)}%)`);
            
            // Check volume against threshold of 110%
            if (currentVolume > VOLUME_THRESHOLD_FOR_VIBRATION) {
              // If not already continuously vibrating, start it
              if (!isContinuousVibrating) {
                startContinuousVibration(currentVolume);
              }
              
              // Log that we detected above threshold sound
              console.log(`VOLUME ABOVE 110% DETECTED: ${(currentVolume * 100).toFixed(0)}%`);
            }
            
            // Check for extremely loud sounds for emergency alerts
            if (currentVolume > VOLUME_THRESHOLD_SCREAM) {
              handleLoudSound(currentVolume, "Potential scream detected");
            } else if (currentVolume > VOLUME_THRESHOLD_HIGH) {
              handleLoudSound(currentVolume, "Loud sound detected");
            } else if (currentVolume > VOLUME_THRESHOLD_MEDIUM) {
              // Medium sounds get logged
              console.log(`Medium sound detected (${Math.round(currentVolume * 100)}%)`);
            }
          }
        }
      );
      
      recording.current = newRecording;
      console.log('Recording started');
      return true;
      
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Failed to start recording: ' + err.message);
      return false;
    }
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
      await recording.current.stopAndUnloadAsync();
      console.log('Recording stopped and unloaded');
      recording.current = null;
      
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };
  
  // Handle loud sound detection
  const handleLoudSound = (volumeLevel, message) => {
    const now = Date.now();
    // Prevent too many alerts (debounce)
    if (now - lastEmergencyTimeRef.current > ALERT_COOLDOWN) {
      // Log loud sound
      console.log(`🔊 LOUD SOUND DETECTED - ${message} (${Math.round(volumeLevel * 100)}%)`);
      
      // Update the UI
      setResults([message]);
      
      // Make sure continuous vibration is active
      if (!isContinuousVibrating) {
        startContinuousVibration(volumeLevel);
      }
      
      // Trigger emergency
      onEmergencyDetected('voice', `${message} (volume level: ${Math.round(volumeLevel * 100)}%)`);
      
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
            : 'Vibrates continuously when volume exceeds 110%'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
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
        
        {isContinuousVibrating && (
          <TouchableOpacity
            style={styles.stopVibrationButton}
            onPress={stopContinuousVibration}
          >
            <Text style={styles.buttonText}>
              Stop Vibration
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
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
  stopVibrationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 8,
    backgroundColor: '#d32f2f', // Red for stop vibration
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