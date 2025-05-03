import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { sendLocationToContacts } from '../utils/sms';

const MapScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(true);
  const [mapError, setMapError] = useState(false);
  
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);

  useEffect(() => {
    // Get location permission and initial position
    (async () => {
      try {
        setIsLoading(true);
        
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        setLocation(initialLocation);
        setIsLoading(false);
        
        // Start location tracking
        startLocationTracking();
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Could not determine your location');
        setIsLoading(false);
      }
    })();

    // Cleanup subscription on unmount
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Start tracking user's location
  const startLocationTracking = async () => {
    try {
      // Stop any existing subscription
      stopLocationTracking();
      
      // Set tracking state
      setIsTracking(true);
      
      // Subscribe to location updates
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // minimum distance (in meters) between updates
          timeInterval: 5000 // minimum time (in ms) between updates
        },
        (newLocation) => {
          setLocation(newLocation);
          
          // Animate to new location if tracking is enabled
          if (isTracking && mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005
            }, 500);
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setErrorMsg('Failed to track location');
    }
  };

  // Stop tracking user's location
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  // Toggle tracking state
  const toggleTracking = () => {
    const newTrackingState = !isTracking;
    setIsTracking(newTrackingState);
    
    if (newTrackingState) {
      // If enabling tracking, animate to current location
      if (location && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005
        }, 500);
      }
      
      // Restart tracking subscription
      startLocationTracking();
    }
  };

  // Share current location
  const shareLocation = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }
    
    const { latitude, longitude } = location.coords;
    const googleMapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    
    try {
      // Use the Share API if available
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const { Share } = require('react-native');
        await Share.share({
          message: `Check my current location: ${googleMapsUrl}`,
          url: googleMapsUrl,
          title: 'My Current Location'
        });
      } else {
        Alert.alert(
          'Share Location',
          `Here's my location: ${googleMapsUrl}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Could not share location');
    }
  };

  // Send location to emergency contacts
  const sendToContacts = () => {
    sendLocationToContacts();
  };

  // Fallback map component when Google Maps fails
  const FallbackMap = () => {
    if (!location) return null;
    
    const { latitude, longitude } = location.coords;
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=600x400&maptype=roadmap&markers=color:red%7C${latitude},${longitude}`;
    
    return (
      <View style={styles.fallbackMapContainer}>
        <Text style={styles.fallbackMapText}>Interactive map unavailable</Text>
        <View style={styles.coordsFallback}>
          <Text style={styles.fallbackCoords}>
            Latitude: {latitude.toFixed(6)}
          </Text>
          <Text style={styles.fallbackCoords}>
            Longitude: {longitude.toFixed(6)}
          </Text>
          <Text style={styles.fallbackCoords}>
            Accuracy: ±{location.coords.accuracy.toFixed(0)}m
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.retryMapButton}
          onPress={() => setMapError(false)}
        >
          <Text style={styles.retryMapButtonText}>Retry Loading Map</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={50} color="#d81b60" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={startLocationTracking}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {!mapError ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              showsUserLocation
              showsMyLocationButton
              followsUserLocation={isTracking}
              initialRegion={{
                latitude: location?.coords.latitude || 0,
                longitude: location?.coords.longitude || 0,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              onError={() => setMapError(true)}
            >
              {location && (
                <Marker
                  coordinate={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  title="Your Location"
                  description="This is your current location"
                  pinColor="#d81b60"
                />
              )}
            </MapView>
          ) : (
            <FallbackMap />
          )}

          <View style={styles.controlPanel}>
            <TouchableOpacity
              style={[styles.controlButton, isTracking ? styles.activeButton : null]}
              onPress={toggleTracking}
            >
              <Text style={styles.controlButtonText}>
                {isTracking ? 'Tracking ON' : 'Tracking OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={shareLocation}
            >
              <Text style={styles.controlButtonText}>Share Location</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={sendToContacts}
          >
            <Text style={styles.emergencyButtonText}>
              Send to Emergency Contacts
            </Text>
          </TouchableOpacity>

          {location && !mapError && (
            <View style={styles.coordinatesContainer}>
              <Text style={styles.coordinatesText}>
                Lat: {location.coords.latitude.toFixed(6)}, 
                Long: {location.coords.longitude.toFixed(6)}
              </Text>
              <Text style={styles.accuracyText}>
                Accuracy: ±{location.coords.accuracy.toFixed(0)}m
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#d81b60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  controlPanel: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: 'rgba(216, 27, 96, 0.9)',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  coordinatesContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    alignItems: 'center',
  },
  coordinatesText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  accuracyText: {
    fontSize: 12,
    color: '#666',
  },
  emergencyButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(216, 27, 96, 0.9)',
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fallbackMapContainer: {
    width: Dimensions.get('window').width,
    height: 300,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackMapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 20,
  },
  coordsFallback: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  fallbackCoords: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  retryMapButton: {
    backgroundColor: '#d81b60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryMapButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MapScreen; 