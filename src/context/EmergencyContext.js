import React, { createContext, useState, useContext, useCallback } from 'react';

const EmergencyContext = createContext();

export const useEmergency = () => useContext(EmergencyContext);

export const EmergencyProvider = ({ children }) => {
  const [shouldTriggerCamera, setShouldTriggerCamera] = useState(false);
  const [emergencyType, setEmergencyType] = useState(null);
  const [lastTriggerTime, setLastTriggerTime] = useState(0);
  
  // Trigger the emergency camera with cooldown (prevents multiple rapid triggers)
  const triggerEmergencyCamera = useCallback((type) => {
    const now = Date.now();
    // 5 second cooldown between triggers
    const COOLDOWN = 5000;
    
    if (now - lastTriggerTime > COOLDOWN) {
      console.log(`🚨 Emergency camera triggered by ${type}`);
      setEmergencyType(type);
      setShouldTriggerCamera(true);
      setLastTriggerTime(now);
    } else {
      console.log(`Camera trigger ignored - cooldown active (${Math.round((COOLDOWN - (now - lastTriggerTime)) / 1000)}s remaining)`);
    }
  }, [lastTriggerTime]);
  
  // Clear the camera trigger after it's been handled
  const clearCameraTrigger = useCallback(() => {
    setShouldTriggerCamera(false);
  }, []);
  
  return (
    <EmergencyContext.Provider 
      value={{ 
        shouldTriggerCamera, 
        emergencyType,
        triggerEmergencyCamera, 
        clearCameraTrigger 
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export default EmergencyContext; 