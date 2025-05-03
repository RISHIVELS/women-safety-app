import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Switch, StyleSheet, Vibration, TouchableOpacity } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';

const MotionDetector = ({ onEmergencyDetected, permissionsGranted = false }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  // Use refs for sensor data to avoid excessive re-renders
  const sensorDataRef = useRef({ 
    acc: { x: 0, y: 0, z: 0 },
    gyro: { x: 0, y: 0, z: 0 },
    shakingIntensity: 0,
    isShaking: false
  });
  // Separate display state that updates less frequently
  const [displayData, setDisplayData] = useState({
    acc: { x: 0, y: 0, z: 0 },
    gyro: { x: 0, y: 0, z: 0 },
    shakingIntensity: 0,
    isShaking: false
  });
  const [sensorAvailable, setSensorAvailable] = useState(false);
  const [isContinuousVibrating, setIsContinuousVibrating] = useState(false);
  
  // Use refs for values that shouldn't trigger rerenders
  const shakingTimeoutRef = useRef(null);
  const lastAlertTimeRef = useRef(0);
  const updateDisplayIntervalRef = useRef(null);
  const isUnmountingRef = useRef(false);
  
  // Define thresholds for detecting potential emergencies
  const ACCELERATION_THRESHOLD = 20; // Adjusted to be more sensitive 
  const SEVERE_ACCELERATION_THRESHOLD = 25; // Threshold for severe movement
  const GYROSCOPE_THRESHOLD = 7; // Adjust based on testing
  const ALERT_COOLDOWN = 3000; // 3 seconds cooldown between alerts
  
  // Vibration patterns
  const VIBRATION_PATTERN = [100, 200, 100, 200]; // Short vibration pattern
  const EMERGENCY_VIBRATION_PATTERN = [0, 500, 200, 500, 200, 500]; // More intense pattern
  const CONTINUOUS_VIBRATION_PATTERN = [100, 50, 300, 50]; // Pattern for continuous vibration
  
  // Subscription references
  const accelerometerSubscriptionRef = useRef(null);
  const gyroscopeSubscriptionRef = useRef(null);

  // Configure sensor update intervals (in ms)
  const UPDATE_INTERVAL = 100; // 10 updates per second
  const DISPLAY_UPDATE_INTERVAL = 500;

  // Check sensor availability on mount and when permissions change
  useEffect(() => {
    let isMounted = true;
    
    const checkSensorAvailability = async () => {
      // Don't attempt to check sensors if permissions aren't granted
      if (!permissionsGranted) {
        if (isMounted) setSensorAvailable(false);
        return;
      }
      
      try {
        const isAccelerometerAvailable = await Accelerometer.isAvailableAsync();
        const isGyroscopeAvailable = await Gyroscope.isAvailableAsync();
        if (isMounted) setSensorAvailable(isAccelerometerAvailable && isGyroscopeAvailable);
      } catch (error) {
        console.error('Error checking sensor availability:', error);
        if (isMounted) setSensorAvailable(false);
      }
    };
    
    checkSensorAvailability();
    
    return () => {
      isMounted = false;
    };
  }, [permissionsGranted]);

  // Start the display update interval when monitoring starts
  useEffect(() => {
    if (isMonitoring) {
      // Update the display periodically to avoid excessive re-renders
      updateDisplayIntervalRef.current = setInterval(() => {
        // Update the display with the current sensor data
        setDisplayData({
          acc: { ...sensorDataRef.current.acc },
          gyro: { ...sensorDataRef.current.gyro },
          shakingIntensity: sensorDataRef.current.shakingIntensity,
          isShaking: sensorDataRef.current.isShaking
        });
      }, DISPLAY_UPDATE_INTERVAL);
    } else if (updateDisplayIntervalRef.current) {
      clearInterval(updateDisplayIntervalRef.current);
      updateDisplayIntervalRef.current = null;
    }
    
    return () => {
      if (updateDisplayIntervalRef.current) {
        clearInterval(updateDisplayIntervalRef.current);
        updateDisplayIntervalRef.current = null;
      }
    };
  }, [isMonitoring]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      safeUnsubscribeFromSensors();
      
      if (shakingTimeoutRef.current) {
        clearTimeout(shakingTimeoutRef.current);
        shakingTimeoutRef.current = null;
      }
      
      if (updateDisplayIntervalRef.current) {
        clearInterval(updateDisplayIntervalRef.current);
        updateDisplayIntervalRef.current = null;
      }
      
      // Cancel any ongoing vibrations
      Vibration.cancel();
      setIsContinuousVibrating(false);
    };
  }, []);

  // Start continuous vibration
  const startContinuousVibration = () => {
    if (isContinuousVibrating || isUnmountingRef.current) return;
    
    console.log('Starting continuous vibration due to rapid motion');
    setIsContinuousVibrating(true);
    
    // Start continuous vibration without asking for permission
    Vibration.vibrate(CONTINUOUS_VIBRATION_PATTERN, true);
  };

  // Stop continuous vibration
  const stopContinuousVibration = () => {
    if (!isContinuousVibrating || isUnmountingRef.current) return;
    
    console.log('Stopping continuous vibration');
    Vibration.cancel();
    setIsContinuousVibrating(false);
  };

  // Monitor changes to isMonitoring state
  useEffect(() => {
    if (isMonitoring && permissionsGranted && sensorAvailable) {
      subscribeToSensors();
    } else {
      safeUnsubscribeFromSensors();
      if (isContinuousVibrating) {
        stopContinuousVibration();
      }
      sensorDataRef.current.shakingIntensity = 0;
      sensorDataRef.current.isShaking = false;
      setDisplayData({
        acc: { x: 0, y: 0, z: 0 },
        gyro: { x: 0, y: 0, z: 0 },
        shakingIntensity: 0,
        isShaking: false
      });
    }
  }, [isMonitoring, permissionsGranted, sensorAvailable]);

  // Handle vibration when shaking state changes
  useEffect(() => {
    // Only vibrate if shaking and not already continuously vibrating
    if (displayData.isShaking && !isContinuousVibrating && !isUnmountingRef.current) {
      Vibration.vibrate(VIBRATION_PATTERN, false);
    }
    
    return () => {
      if (!isContinuousVibrating) {
        Vibration.cancel();
      }
    };
  }, [displayData.isShaking, isContinuousVibrating]);
  
  // Clear any ongoing shaking timeout
  const clearShakingTimeout = () => {
    if (shakingTimeoutRef.current) {
      clearTimeout(shakingTimeoutRef.current);
      shakingTimeoutRef.current = null;
    }
  };

  // Safe unsubscribe method to prevent call stack issues
  const safeUnsubscribeFromSensors = () => {
    try {
      if (accelerometerSubscriptionRef.current) {
        const subscription = accelerometerSubscriptionRef.current;
        accelerometerSubscriptionRef.current = null;
        subscription.remove();
      }
      
      if (gyroscopeSubscriptionRef.current) {
        const subscription = gyroscopeSubscriptionRef.current;
        gyroscopeSubscriptionRef.current = null;
        subscription.remove();
      }
    } catch (error) {
      console.error('Error safely unsubscribing from sensors:', error);
    }
  };

  const subscribeToSensors = () => {
    // Don't attempt to subscribe if sensors aren't available
    if (!sensorAvailable || !permissionsGranted || isUnmountingRef.current) return;

    try {
      // Ensure we're not already subscribed
      safeUnsubscribeFromSensors();
      
      // Set update intervals
      Accelerometer.setUpdateInterval(UPDATE_INTERVAL);
      Gyroscope.setUpdateInterval(UPDATE_INTERVAL);
      
      // Subscribe to accelerometer
      accelerometerSubscriptionRef.current = Accelerometer.addListener(accelerometerData => {
        // Skip processing if unmounting
        if (isUnmountingRef.current) return;
        
        // Store data in ref instead of state to prevent excess renders
        sensorDataRef.current.acc = accelerometerData;
        
        // Calculate magnitude of acceleration vector
        const magnitude = calculateMagnitude(
          accelerometerData.x,
          accelerometerData.y,
          accelerometerData.z - 9.8 // Subtract gravity
        );
        
        // Update shaking intensity in ref
        sensorDataRef.current.shakingIntensity = magnitude;
        
        // Check if device is being shaken
        if (magnitude > ACCELERATION_THRESHOLD / 2) {
          if (!sensorDataRef.current.isShaking) {
            sensorDataRef.current.isShaking = true;
          }
          
          // Clear any existing timeout
          clearShakingTimeout();
          
          // Reset shake state after 1 second if no new high movements
          shakingTimeoutRef.current = setTimeout(() => {
            if (!isUnmountingRef.current) {
              sensorDataRef.current.isShaking = false;
            }
          }, 1000);
        }
        
        // Check for sudden movement that exceeds emergency threshold
        if (magnitude > SEVERE_ACCELERATION_THRESHOLD) {
          // Start continuous vibration immediately
          startContinuousVibration();
          handleEmergencyDetection('Severe movement detected', magnitude);
        } else if (magnitude > ACCELERATION_THRESHOLD) {
          handleEmergencyDetection('Sudden movement detected', magnitude);
        }
      });
      
      // Subscribe to gyroscope
      gyroscopeSubscriptionRef.current = Gyroscope.addListener(gyroscopeData => {
        // Skip processing if unmounting
        if (isUnmountingRef.current) return;
        
        // Store gyro data in ref
        sensorDataRef.current.gyro = gyroscopeData;
        
        // Calculate angular velocity magnitude
        const rotationMagnitude = calculateMagnitude(
          gyroscopeData.x,
          gyroscopeData.y,
          gyroscopeData.z
        );
        
        // Check for rapid rotation
        if (rotationMagnitude > GYROSCOPE_THRESHOLD) {
          // Start continuous vibration immediately without asking permission
          startContinuousVibration();
          
          // Then notify about emergency
          handleEmergencyDetection('Rapid rotation detected', rotationMagnitude);
        }
      });
    } catch (error) {
      console.error('Error subscribing to sensors:', error);
    }
  };

  const unsubscribeFromSensors = () => {
    safeUnsubscribeFromSensors();
  };

  // Calculate magnitude of a 3D vector
  const calculateMagnitude = (x, y, z) => {
    return Math.sqrt(x * x + y * y + z * z);
  };

  // Handle emergency detection with debouncing to prevent multiple alerts
  const handleEmergencyDetection = (reason, value) => {
    // Skip if component is unmounting
    if (isUnmountingRef.current) return;
    
    const now = Date.now();
    if (now - lastAlertTimeRef.current > ALERT_COOLDOWN) {
      console.log(`${reason}: ${value.toFixed(2)}`);
      onEmergencyDetected('motion', `${reason} (value: ${value.toFixed(2)})`);
      lastAlertTimeRef.current = now;
    }
  };

  // Calculate the shake intensity percentage for visual feedback
  const getShakeIntensityPercentage = () => {
    const percentage = (displayData.shakingIntensity / SEVERE_ACCELERATION_THRESHOLD) * 100;
    return Math.min(100, Math.max(0, percentage));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Motion Detection</Text>
      
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>
          {isMonitoring ? 'Monitoring active' : 'Monitoring inactive'}
          {isContinuousVibrating ? ' (VIBRATING)' : ''}
        </Text>
        <Switch
          value={isMonitoring}
          onValueChange={(value) => {
            setIsMonitoring(value);
            if (!value) {
              stopContinuousVibration();
            }
          }}
          trackColor={{ false: '#767577', true: '#f8bbd0' }}
          thumbColor={isMonitoring ? '#d81b60' : '#f4f3f4'}
          disabled={!sensorAvailable || !permissionsGranted}
        />
      </View>
      
      {!permissionsGranted && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Motion sensor permission not granted
          </Text>
        </View>
      )}

      {permissionsGranted && !sensorAvailable && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Sensor not available on this device
          </Text>
        </View>
      )}
      
      {isMonitoring && sensorAvailable && permissionsGranted && (
        <View style={styles.sensorData}>
          <Text style={styles.sensorTitle}>Sensor Readings:</Text>
          <Text style={styles.sensorText}>
            Accelerometer: x={displayData.acc.x.toFixed(2)}, y={displayData.acc.y.toFixed(2)}, z={displayData.acc.z.toFixed(2)}
          </Text>
          <Text style={styles.sensorText}>
            Gyroscope: x={displayData.gyro.x.toFixed(2)}, y={displayData.gyro.y.toFixed(2)}, z={displayData.gyro.z.toFixed(2)}
          </Text>
          <Text style={styles.sensorText}>
            Movement magnitude: {displayData.shakingIntensity.toFixed(2)}
          </Text>
          
          {/* Shake intensity meter */}
          <View style={styles.intensityContainer}>
            <Text style={styles.intensityLabel}>Shake Intensity:</Text>
            <View style={styles.intensityMeterBackground}>
              <View 
                style={[
                  styles.intensityMeterFill, 
                  { 
                    width: `${getShakeIntensityPercentage()}%`,
                    backgroundColor: displayData.shakingIntensity > ACCELERATION_THRESHOLD 
                      ? '#ff0000' 
                      : displayData.shakingIntensity > ACCELERATION_THRESHOLD/2 
                        ? '#ff9800' 
                        : '#4caf50'
                  }
                ]} 
              />
            </View>
          </View>
          
          {isContinuousVibrating && (
            <View style={styles.continuousVibrationContainer}>
              <Text style={styles.emergencyText}>
                CONTINUOUS VIBRATION ACTIVE
              </Text>
              <TouchableOpacity 
                style={styles.stopButton}
                onPress={stopContinuousVibration}
              >
                <Text style={styles.stopButtonText}>Stop Vibration</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {displayData.isShaking && (
            <Text style={styles.alertText}>
              * Device shake detected! * {displayData.shakingIntensity > SEVERE_ACCELERATION_THRESHOLD ? 'SEVERE' : 'Moderate'}
            </Text>
          )}
        </View>
      )}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
    marginVertical: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  sensorData: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#d81b60',
  },
  sensorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sensorText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  intensityContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  intensityLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  intensityMeterBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  intensityMeterFill: {
    height: '100%',
    borderRadius: 4,
  },
  alertText: {
    marginTop: 10,
    color: '#d81b60',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  continuousVibrationContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f44336',
    alignItems: 'center',
  },
  emergencyText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  stopButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 4,
  },
  stopButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default MotionDetector; 