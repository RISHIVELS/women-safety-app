import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, FlatList, Vibration, Switch } from 'react-native';
import { sendEmergencySMS, testSendSMS } from '../utils/sms';
import { sendEmergencyAlert } from '../utils/api';
import { useUser } from '../context/UserContext';

const EmergencyAlertManager = forwardRef((props, ref) => {
  const [alertHistory, setAlertHistory] = useState([]);
  const [isAlarming, setIsAlarming] = useState(false);
  const [autoSendSMS, setAutoSendSMS] = useState(true);
  const [smsSent, setSmsSent] = useState(false);
  const [apiAlertSent, setApiAlertSent] = useState(false);
  const { userName, location } = useUser();
  
  // Vibration pattern: wait 500ms, vibrate 500ms, wait 500ms, vibrate 500ms
  const VIBRATION_PATTERN = [500, 500, 500, 500];

  // Start emergency alert with vibration and SMS
  const startAlert = async (type, details) => {
    console.log('Starting emergency alert...');
    setIsAlarming(true);
    
    // Start repeated vibration
    Vibration.vibrate(VIBRATION_PATTERN, true);
    
    // PRIORITY 1: Send emergency alert to backend API immediately
    if (!apiAlertSent) {
      console.log('PRIORITY: Sending emergency alert to API server...');
      sendApiAlert(type, details);
    }
    
    // PRIORITY 2: Send SMS if enabled and not already sent for this alert
    if (autoSendSMS && !smsSent) {
      console.log('Sending emergency SMS...');
      const sent = await sendEmergencySMS(type, details);
      setSmsSent(sent);
      
      if (!sent) {
        console.log('Failed to send SMS or no contacts configured');
      }
    }
  };

  // Send alert to the backend API
  const sendApiAlert = async (type, details) => {
    if (!userName) {
      console.log('No user name available for API alert');
      Alert.alert(
        'Alert Not Sent',
        'Please provide your name in the app settings to enable emergency alerts.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      console.log('Sending emergency alert to backend API...');
      const alertData = {
        name: userName,
        address: location || 'Unknown location',
        alertType: type,
        details: details,
        timestamp: new Date().toISOString()
      };

      const response = await sendEmergencyAlert(alertData);
      setApiAlertSent(response.success);
      
      if (response.success) {
        console.log('Successfully sent alert to backend API');
      } else {
        console.log(`Failed to send alert to backend API: ${response.error}`);
        
        // Only show an alert for test button, not during actual emergency
        if (type === 'test') {
          if (response.offline) {
            Alert.alert(
              'Connection Failed',
              'Could not connect to the emergency server. Please check your internet connection.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Alert Not Sent',
              `Failed to send emergency alert: ${response.error}`,
              [{ text: 'OK' }]
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending API alert:', error);
    }
  };

  // Handle incoming emergency alerts
  const handleEmergency = (type, details) => {
    // Reset sent flags for new alerts
    setSmsSent(false);
    setApiAlertSent(false);
    
    // Create a new alert entry
    const newAlert = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      details,
    };
    
    // Update alert history
    setAlertHistory(prevAlerts => [newAlert, ...prevAlerts]);
    
    // For all emergency types, automatically send alert without showing popups
    console.log(`EMERGENCY DETECTED (${type}): Automatically sending alert`);
    
    // Just add a notification to the console and history
    if (type === 'voice') {
      console.log(`🔊 VOICE ALERT: ${details}`);
    } else if (type === 'motion') {
      console.log(`📱 MOTION ALERT: ${details}`);
    } else {
      console.log(`⚠️ ALERT (${type}): ${details}`);
    }
    
    // Automatically start the alert without showing any popup
    startAlert(type, details);
  };

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    handleEmergency
  }));

  // Stop the alert
  const stopAlert = () => {
    if (isAlarming) {
      Vibration.cancel();
      setIsAlarming(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isAlarming) {
        Vibration.cancel();
      }
    };
  }, [isAlarming]);

  // Clear alert history
  const clearHistory = () => {
    setAlertHistory([]);
  };


  // Render alert history item
  const renderAlertItem = ({ item }) => (
    <View style={styles.alertItem}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertType}>
          {item.type === 'voice' ? '🔊 Voice' : '📱 Motion'}
        </Text>
        <Text style={styles.alertTime}>{item.timestamp}</Text>
      </View>
      <Text style={styles.alertDetails}>{item.details}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Emergency Alerts</Text>
        
        {isAlarming && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopAlert}
          >
            <Text style={styles.stopButtonText}>Stop Alert</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.smsSettingsContainer}>
        <Text style={styles.smsSettingsLabel}>Auto-send SMS in emergency:</Text>
        <Switch
          value={autoSendSMS}
          onValueChange={setAutoSendSMS}
          trackColor={{ false: '#767577', true: '#f8bbd0' }}
          thumbColor={autoSendSMS ? '#d81b60' : '#f4f3f4'}
        />
      </View>
      
      
      {alertHistory.length > 0 ? (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Alert History</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          {/* Using nestedScrollEnabled and a fixed height to avoid the FlatList inside ScrollView warning */}
          <FlatList
            data={alertHistory}
            renderItem={renderAlertItem}
            keyExtractor={item => item.id}
            style={styles.alertList}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            maxToRenderPerBatch={10}
            windowSize={10}
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No alerts yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Alerts will appear here when voice or motion triggers are detected
          </Text>
        </View>
      )}

    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d81b60',
  },
  stopButton: {
    backgroundColor: '#ff5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stopButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  smsSettingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  smsSettingsLabel: {
    fontSize: 14,
    color: '#555',
  },

  historyContainer: {
    marginVertical: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    color: '#d81b60',
    fontSize: 14,
  },
  alertList: {
    height: 200, // Fixed height to avoid layout issues
    flexGrow: 0,
  },
  alertItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#d81b60',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertType: {
    fontWeight: 'bold',
    color: '#d81b60',
  },
  alertTime: {
    color: '#888',
    fontSize: 12,
  },
  alertDetails: {
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 16,
  },

});

export default EmergencyAlertManager; 