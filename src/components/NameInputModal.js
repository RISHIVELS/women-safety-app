import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Keyboard } from 'react-native';
import { useUser } from '../context/UserContext';

const NameInputModal = ({ visible, onClose }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const { saveUserName, saveUserLocation } = useUser();

  const handleSubmit = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();
    
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter your name');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Missing Information', 'Please enter your address');
      return;
    }

    try {
      // Save the user data
      await saveUserName(name);
      await saveUserLocation(address);
      
      console.log('User information saved successfully');
      
      // Close the modal after a short delay to ensure data is saved
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 300);
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Welcome to SafeGuard</Text>
          <Text style={styles.subtitle}>Please enter your information</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            value={name}
            onChangeText={setName}
            maxLength={50}
            returnKeyType="next"
          />
          
          <TextInput
            style={[styles.input, styles.addressInput]}
            placeholder="Your Address"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
          
          <Text style={styles.note}>
            This information will only be used in case of emergency
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d81b60',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#d81b60',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    marginTop: 15,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});

export default NameInputModal; 