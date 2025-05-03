import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'emergency_contacts';

const ContactsManager = () => {
  const [contacts, setContacts] = useState([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Load contacts from storage on component mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Save contacts to persistent storage
  const saveContacts = async (contactsToSave) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(contactsToSave));
    } catch (error) {
      console.error('Error saving contacts:', error);
      Alert.alert('Error', 'Failed to save contacts');
    }
  };

  // Load contacts from persistent storage
  const loadContacts = async () => {
    try {
      const storedContacts = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  // Add a new contact
  const addContact = () => {
    // Validate inputs
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!newPhone.trim() || !newPhone.trim().match(/^[0-9+\s()-]{6,15}$/)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    // Create new contact
    const newContact = {
      id: Date.now().toString(),
      name: newName.trim(),
      phone: newPhone.trim()
    };

    // Update state and storage
    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    saveContacts(updatedContacts);

    // Reset input fields
    setNewName('');
    setNewPhone('');
  };

  // Delete a contact
  const deleteContact = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const updatedContacts = contacts.filter(contact => contact.id !== id);
            setContacts(updatedContacts);
            saveContacts(updatedContacts);
          }
        }
      ]
    );
  };

  // Render contact item
  const renderContact = ({ item }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteContact(item.id)}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Contacts</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Contact Name"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={newPhone}
          onChangeText={setNewPhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.addButton} onPress={addContact}>
          <Text style={styles.addButtonText}>Add Contact</Text>
        </TouchableOpacity>
      </View>
      
      {contacts.length > 0 ? (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={item => item.id}
          style={styles.contactList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No emergency contacts</Text>
          <Text style={styles.emptyStateSubtext}>
            Add contacts to notify in case of emergency
          </Text>
        </View>
      )}
    </View>
  );
};

// Utility function to get contacts (for other components to use)
export const getEmergencyContacts = async () => {
  try {
    const storedContacts = await AsyncStorage.getItem(STORAGE_KEY);
    return storedContacts ? JSON.parse(storedContacts) : [];
  } catch (error) {
    console.error('Error getting contacts:', error);
    return [];
  }
};

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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#d81b60',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#d81b60',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contactList: {
    maxHeight: 200,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
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
  },
});

export default ContactsManager; 