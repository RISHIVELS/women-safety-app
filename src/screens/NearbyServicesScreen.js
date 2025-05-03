import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from 'react-native-vector-icons';
import { fetchNearbyPlaces, getDirectionsUrl } from '../utils/services';

const NearbyServicesScreen = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [selectedType, setSelectedType] = useState('police'); // 'police' or 'hospital'

  // Request location permission and get current position
  useEffect(() => {
    (async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        
        setLocation(currentLocation);
        
        // Fetch nearby places after getting location
        if (currentLocation) {
          fetchNearbyServicesData(currentLocation, selectedType);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Unable to get current location. Please check your device settings.');
        setLoading(false);
      }
    })();
  }, []);

  // Fetch nearby places when selected type changes
  useEffect(() => {
    if (location) {
      fetchNearbyServicesData(location, selectedType);
    }
  }, [selectedType]);

  // Function to fetch nearby places data
  const fetchNearbyServicesData = async (location, type) => {
    setLoading(true);
    
    try {
      const places = await fetchNearbyPlaces(location, type);
      setNearbyPlaces(places);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      setErrorMsg('Failed to fetch nearby places. Please try again later.');
      setLoading(false);
    }
  };

  // Function to get directions to a place
  const getDirections = (place) => {
    if (!location) return;
    
    try {
      const url = getDirectionsUrl(location, place.coordinates);
      
      Alert.alert(
        'Get Directions',
        `Would you like to get directions to ${place.name}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open Maps',
            onPress: () => {
              // In a real app, we would use Linking to open maps
              Linking.openURL(url).catch(err => {
                Alert.alert('Error', 'Could not open maps app. Please make sure you have a maps app installed.');
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error getting directions:', error);
      Alert.alert('Error', 'Could not get directions. Please try again.');
    }
  };

  // Toggle between police stations and hospitals
  const togglePlaceType = () => {
    setSelectedType(selectedType === 'police' ? 'hospital' : 'police');
  };

  // Refresh data
  const refreshData = () => {
    if (location) {
      fetchNearbyServicesData(location, selectedType);
    }
  };

  // Loading screen
  if (loading && !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d81b60" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  // Error screen
  if (errorMsg) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={60} color="#d32f2f" />
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setErrorMsg(null);
            setLoading(true);
            refreshData();
          }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map view showing user location and nearby places */}
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {/* Markers for nearby places */}
          {nearbyPlaces.map(place => (
            <Marker
              key={place.id}
              coordinate={place.coordinates}
              title={place.name}
              description={place.vicinity}
              pinColor={selectedType === 'police' ? '#0066cc' : '#d32f2f'}
            >
              <Callout onPress={() => getDirections(place)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{place.name}</Text>
                  <Text style={styles.calloutAddress}>{place.vicinity}</Text>
                  <Text style={styles.calloutDistance}>{place.distance.toFixed(1)} km away</Text>
                  <Text style={styles.calloutAction}>Tap for directions</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Toggle button to switch between police stations and hospitals */}
      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          { backgroundColor: selectedType === 'police' ? '#0066cc' : '#d32f2f' }
        ]}
        onPress={togglePlaceType}
      >
        <MaterialIcons 
          name={selectedType === 'police' ? 'local-police' : 'local-hospital'} 
          size={24} 
          color="white" 
        />
        <Text style={styles.toggleButtonText}>
          {loading ? 'Loading...' : `Showing ${selectedType === 'police' ? 'Police Stations' : 'Hospitals'}`}
        </Text>
      </TouchableOpacity>

      {/* Refresh button */}
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={refreshData}
        disabled={loading}
      >
        <MaterialIcons 
          name="refresh" 
          size={24} 
          color="white" 
        />
      </TouchableOpacity>

      {/* Info panel showing number of nearby places */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>
          {selectedType === 'police' ? 'Nearby Police Stations' : 'Nearby Hospitals'}
        </Text>
        <Text style={styles.infoCount}>
          {nearbyPlaces.length} {selectedType === 'police' ? 'stations' : 'hospitals'} found nearby
        </Text>
        <Text style={styles.infoHelp}>
          Tap on a marker to see details and get directions
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#d81b60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoCount: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  infoHelp: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  callout: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  calloutDistance: {
    fontSize: 12,
    color: '#0066cc',
    marginBottom: 4,
  },
  calloutAction: {
    fontSize: 12,
    color: '#d81b60',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
});

export default NearbyServicesScreen; 