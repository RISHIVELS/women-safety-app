import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Switch, StyleSheet, Vibration } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useEmergency } from '../context/EmergencyContext';

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
  
  // Use refs for values that shouldn't trigger rerenders
  const shakingTimeoutRef = useRef(null);
  const lastAlertTimeRef = useRef(0);
  const updateDisplayIntervalRef = useRef(null);
  const emergencyModeRef = useRef(false);
  
  // Define thresholds for detecting potential emergencies
  const ACCELERATION_THRESHOLD = 20; // Adjusted to be more sensitive 
  const SEVERE_ACCELERATION_THRESHOLD = 25; // Threshold for severe movement
  const GYROSCOPE_THRESHOLD = 7; // Adjust based on testing
  const ALERT_COOLDOWN = 3000; // 3 seconds cooldown between alerts
  
  // Vibration patterns
  const VIBRATION_PATTERN = [100, 200, 100, 200]; // Short vibration pattern
  const EMERGENCY_VIBRATION_PATTERN = [0, 500, 200, 500, 200, 500]; // More intense pattern
  
  // Subscription references
  const accelerometerSubscriptionRef = useRef(null);
  const gyroscopeSubscriptionRef = useRef(null);

  // Configure sensor update intervals (in ms)
  const UPDATE_INTERVAL = 100; // 10 updates per second
  const DISPLAY_UPDATE_INTERVAL = 500; // Only update display 2 times per second

  // Access the emergency context
  const { triggerEmergencyCamera } = useEmergency();

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
      unsubscribeFromSensors();
      
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
    };
  }, []);

  // Monitor changes to isMonitoring state
  useEffect(() => {
    if (isMonitoring && permissionsGranted && sensorAvailable) {
      subscribeToSensors();
    } else {
      unsubscribeFromSensors();
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
  
  // Always subscribe to sensors at low frequency for emergency detection
  // even if user hasn't enabled monitoring
  useEffect(() => {
    // Try to initialize emergency sensor monitoring regardless of permissions
    if (!isMonitoring) {
      tryEmergencyMonitoring();
    }
    
    return () => {
      if (emergencyModeRef.current) {
        unsubscribeEmergencySensors();
      }
    };
  }, []);

  // Handle vibration when shaking state changes
  useEffect(() => {
    if (displayData.isShaking) {
      // Vibrate the device when shaking is detected
      Vibration.vibrate(VIBRATION_PATTERN, false);
    } else {
      Vibration.cancel();
    }
    
    return () => {
      Vibration.cancel();
    };
  }, [displayData.isShaking]);
  
  // Clear any ongoing shaking timeout
  const clearShakingTimeout = () => {
    if (shakingTimeoutRef.current) {
      clearTimeout(shakingTimeoutRef.current);
      shakingTimeoutRef.current = null;
    }
  };

  // Try to initialize emergency monitoring regardless of permission state
  const tryEmergencyMonitoring = () => {
    try {
      // Only subscribe for emergency monitoring if not already monitoring
      if (!accelerometerSubscriptionRef.current && !emergencyModeRef.current) {
        emergencyModeRef.current = true;
        
        // Set a longer update interval for background monitoring to save battery
        Accelerometer.setUpdateInterval(1000); // Once per second is enough for emergencies
        
        // Subscribe only to accelerometer for emergency detection
        accelerometerSubscriptionRef.current = Accelerometer.addListener(accelerometerData => {
          // Only process for emergency detection (severe shaking)
          const magnitude = calculateMagnitude(
            accelerometerData.x,
            accelerometerData.y,
            accelerometerData.z - 9.8 // Subtract gravity
          );
          
          // Only alert for severe movements when in emergency mode
          if (magnitude > SEVERE_ACCELERATION_THRESHOLD) {
            handleEmergencyDetection('SEVERE movement detected', magnitude);
            Vibration.vibrate(EMERGENCY_VIBRATION_PATTERN);
            
            // If we detect an emergency, switch to regular monitoring mode if possible
            if (!isMonitoring && sensorAvailable) {
              setIsMonitoring(true);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error initializing emergency monitoring:', error);
      emergencyModeRef.current = false;
    }
  };

  // Unsubscribe from emergency-only sensors
  const unsubscribeEmergencySensors = () => {
    try {
      if (accelerometerSubscriptionRef.current && emergencyModeRef.current) {
        accelerometerSubscriptionRef.current.remove();
        accelerometerSubscriptionRef.current = null;
        emergencyModeRef.current = false;
      }
    } catch (error) {
      console.error('Error unsubscribing from emergency sensors:', error);
    }
  };

  const subscribeToSensors = () => {
    // Clean up any existing subscriptions first
    unsubscribeFromSensors();
    
    // Don't attempt to subscribe if sensors aren't available
    // Note: We'll still try to monitor for emergencies even without permissions
    if (!sensorAvailable) {
      tryEmergencyMonitoring();
      return;
    }

    try {
      // Set update intervals
      Accelerometer.setUpdateInterval(UPDATE_INTERVAL);
      Gyroscope.setUpdateInterval(UPDATE_INTERVAL);
      
      // Subscribe to accelerometer
      accelerometerSubscriptionRef.current = Accelerometer.addListener(accelerometerData => {
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
            sensorDataRef.current.isShaking = false;
          }, 1000);
        }
        
        // Check for sudden movement that exceeds emergency threshold
        if (magnitude > ACCELERATION_THRESHOLD) {
          // For severe movements, trigger special vibration
          if (magnitude > SEVERE_ACCELERATION_THRESHOLD) {
            Vibration.vibrate(EMERGENCY_VIBRATION_PATTERN);
          }
          
          handleEmergencyDetection('Sudden movement detected', magnitude);
        }
      });
      
      // Subscribe to gyroscope
      gyroscopeSubscriptionRef.current = Gyroscope.addListener(gyroscopeData => {
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
          handleEmergencyDetection('Rapid rotation detected', rotationMagnitude);
        }
      });
    } catch (error) {
      console.error('Error subscribing to sensors:', error);
      // Fallback to emergency-only monitoring
      tryEmergencyMonitoring();
    }
  };

  const unsubscribeFromSensors = () => {
    try {
      if (accelerometerSubscriptionRef.current) {
        accelerometerSubscriptionRef.current.remove();
        accelerometerSubscriptionRef.current = null;
      }
      
      if (gyroscopeSubscriptionRef.current) {
        gyroscopeSubscriptionRef.current.remove();
        gyroscopeSubscriptionRef.current = null;
      }
      
      // Reset emergency mode flag if necessary
      emergencyModeRef.current = false;
    } catch (error) {
      console.error('Error unsubscribing from sensors:', error);
    }
  };

  // Calculate magnitude of a 3D vector
  const calculateMagnitude = (x, y, z) => {
    return Math.sqrt(x * x + y * y + z * z);
  };

  // Handle emergency detection with debouncing to prevent multiple alerts
  const handleEmergencyDetection = (reason, value) => {
    const now = Date.now();
    if (now - lastAlertTimeRef.current > ALERT_COOLDOWN) {
      console.log(`${reason}: ${value.toFixed(2)}`);
      console.log(`🚨 MOTION EMERGENCY DETECTED - This will send data to backend API`);
      onEmergencyDetected('motion', `${reason} (value: ${value.toFixed(2)})`);
      
      // Trigger emergency camera for severe movement
      if (value > SEVERE_ACCELERATION_THRESHOLD) {
        console.log('Severe motion detected - triggering emergency camera');
        triggerEmergencyCamera('motion');
      }
      
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
        </Text>
        <Switch
          value={isMonitoring}
          onValueChange={setIsMonitoring}
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
});

export default MotionDetector; 