import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import NearbyServicesScreen from '../screens/NearbyServicesScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = ({ permissionsGranted, microphonePermission, motionPermission }) => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            let IconComponent = Ionicons;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Map') {
              iconName = focused ? 'map' : 'map-outline';
            } else if (route.name === 'Nearby') {
              IconComponent = MaterialIcons;
              iconName = 'location-on';
            }

            return <IconComponent name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#d81b60',
          tabBarInactiveTintColor: 'gray',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#d81b60',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          options={{ title: 'SafeGuard' }}
        >
          {(props) => (
            <HomeScreen 
              {...props} 
              permissionsGranted={permissionsGranted}
              microphonePermission={microphonePermission}
              motionPermission={motionPermission}
            />
          )}
        </Tab.Screen>
        <Tab.Screen 
          name="Map" 
          component={MapScreen} 
          options={{ title: 'Location Tracker' }}
        />
        <Tab.Screen 
          name="Nearby" 
          component={NearbyServicesScreen} 
          options={{ title: 'Nearby Services' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 