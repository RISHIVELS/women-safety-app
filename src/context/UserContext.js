import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create context
const UserContext = createContext();

// Custom hook to use the user context
export const useUser = () => useContext(UserContext);

// Provider component
export const UserProvider = ({ children }) => {
  const [userName, setUserName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from storage on initial render
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        const storedLocation = await AsyncStorage.getItem('userLocation');

        if (storedName) setUserName(storedName);
        if (storedLocation) setLocation(storedLocation);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Save user name to storage
  const saveUserName = async (name) => {
    try {
      await AsyncStorage.setItem('userName', name);
      setUserName(name);
      return true;
    } catch (error) {
      console.error('Error saving user name:', error);
      return false;
    }
  };

  // Save user location to storage
  const saveUserLocation = async (loc) => {
    try {
      await AsyncStorage.setItem('userLocation', loc);
      setLocation(loc);
      return true;
    } catch (error) {
      console.error('Error saving user location:', error);
      return false;
    }
  };

  // Value object that will be passed to consumers
  const value = {
    userName,
    location,
    isLoading,
    saveUserName,
    saveUserLocation
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}; 