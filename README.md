# SafeGuard: Women's Safety App

A React Native mobile application built with Expo that uses smartphone sensors to autonomously detect emergency situations through voice recognition and motion detection to alert users in an emergency situation.

## Features

- **Voice Detection**: Listens for distress keywords such as "help", "emergency", "save me", etc.
- **Motion Detection**: Uses device accelerometer and gyroscope to detect sudden falls or aggressive movements
- **Emergency Alerts**: Triggers vibration alerts when potential emergency situations are detected
- **Alert History**: Maintains a log of detected emergency events
- 📍 Real-Time Location Tracking - Continuously tracks the user’s GPS location during emergencies - Sends live location to trusted contacts or emergency services
- **Contact Management**: Allows users to add and manage trusted contacts for emergency alerts
- **Emergency Services Integration**: Integrates with emergency services APIs to send real-time location data
- **User-Friendly Interface**: Easy-to-use interface with intuitive controls and clear instructions
- **Secure Data Storage**: Stores user data securely and encrypts sensitive information
- **Cross-Platform**: Works on both Android and iOS devices
  -🛡️ Nearest Safe Zones & Police Stations - Displays nearest police stations, hospitals, and safe zones
  -Option to navigate to nearest one
- Button phone users Trigger Mechanism
  📞 Trigger via Phone Call
  The Button phone user simply presses the number 6 on the dial pad it will activate the twilio number that is preseted.
  This triggers the backend system to:
  Log the call
  send Sms
  send prerecorded voice calls
  send whatsapp messages to the registered user's emergency contacts
  Send an SOS alert to the registered user's emergency contacts

## Getting Started

### Prerequisites

- Node.js (>=14.0.0)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app installed on your mobile device

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```

### Running the app

```
npm start
```

This will start the Expo development server. You can then:

- Scan the QR code with the Expo Go app on your Android device
- Press 'i' to open in an iOS simulator (Mac only)
- Press 'a' to open in an Android emulator

## How to Use

1. **Voice Detection**

   - Tap the "Start Listening" button
   - The app will listen for keywords like "help", "emergency", "stop" using whisper speech to text model and alert when it detects them
   - When a keyword is detected, an emergency alert will be triggered

2. **Motion Detection**

   - Toggle the switch to start monitoring motion
   - The app will monitor device accelerometer and gyroscope data
   - When shake intensity exceeds thresholds, an emergency alert will be triggered
   - Device will vibrate when shake is detected as visual and tactile feedback

3. **Emergency Alerts**
   - When an alert is triggered, you can choose to activate the vibration alert
   - A history of alerts is maintained in the app
   - Using the "Test Alert" button to test the alert functionality

4. **Twilio Integration for Making calls , sending sms and whatsapp messages**

## Technical Details

- Built with React Native and Expo
- Uses @react-native-voice/voice for real speech recognition
- Uses expo-sensors for accessing device accelerometer and gyroscope
- Uses device vibration for alerting in emergency situations

## Permissions

This app requires the following permissions:

- Microphone access for voice detection
- Motion sensor access for accelerometer and gyroscope data
- Vibration capability for alerts
- camara access for taking pictures
- Location access for tracking location 

## This app also works during battery saver mode and also in do not disturb modes

## Notes

- The app works in the foreground and background to detect emergency situations
