import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, FlatList, Vibration } from 'react-native';

const EmergencyAlertManager = forwardRef((props, ref) => {
  const [alertHistory, setAlertHistory] = useState([]);
  const [isAlarming, setIsAlarming] = useState(false);
  
  // Vibration pattern: wait 500ms, vibrate 500ms, wait 500ms, vibrate 500ms
  const VIBRATION_PATTERN = [500, 500, 500, 500];

  // Start emergency alert with vibration
  const startAlert = () => {
    console.log('Starting emergency alert...');
    setIsAlarming(true);
    
    // Start repeated vibration
    Vibration.vibrate(VIBRATION_PATTERN, true);
  };

  // Handle incoming emergency alerts
  const handleEmergency = (type, details) => {
    // Create a new alert entry
    const newAlert = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      details,
    };
    
    // Update alert history
    setAlertHistory(prevAlerts => [newAlert, ...prevAlerts]);
    
    // Show alert dialog
    Alert.alert(
      'Emergency Detected',
      `Type: ${type}\nDetails: ${details}`,
      [
        {
          text: 'Ignore',
          style: 'cancel',
        },
        {
          text: 'Vibrate Alert',
          onPress: startAlert,
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
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
      
      <TouchableOpacity
        style={styles.testButton}
        onPress={() => handleEmergency('test', 'Manual test alert')}
      >
        <Text style={styles.testButtonText}>Test Alert</Text>
      </TouchableOpacity>
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
  testButton: {
    backgroundColor: '#d81b60',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EmergencyAlertManager; 