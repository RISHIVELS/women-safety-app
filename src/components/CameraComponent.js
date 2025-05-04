import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { uploadEmergencyImage } from '../utils/api';
import { useUser } from '../context/UserContext';

const CameraComponent = () => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const { userName, location } = useUser();

  const openCamera = async () => {
    try {
      // Ask for camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to use this feature');
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        console.log('Photo taken:', imageUri);
        setSavedLocally(false);
        
        // Upload the photo to the server
        uploadImage(imageUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const saveImageLocally = async (uri) => {
    try {
      // Create emergency images directory if it doesn't exist
      const emergencyDir = `${FileSystem.documentDirectory}emergency_images/`;
      const dirInfo = await FileSystem.getInfoAsync(emergencyDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(emergencyDir, { intermediates: true });
      }
      
      // Generate a unique filename with timestamp
      const fileName = `emergency_${new Date().getTime()}.jpg`;
      const newUri = `${emergencyDir}${fileName}`;
      
      // Copy the image to our app's documents directory
      await FileSystem.copyAsync({
        from: uri,
        to: newUri
      });
      
      console.log('Image saved locally at:', newUri);
      
      // Store metadata alongside the image
      const metadataFile = `${newUri}.metadata.json`;
      const metadata = {
        originalUri: uri,
        timestamp: new Date().toISOString(),
        userName: userName || 'Unknown User',
        latitude: location?.coords?.latitude || 'Unknown',
        longitude: location?.coords?.longitude || 'Unknown',
        pending: true // Mark as pending upload
      };
      
      await FileSystem.writeAsStringAsync(metadataFile, JSON.stringify(metadata));
      
      return { success: true, savedUri: newUri };
    } catch (error) {
      console.error('Error saving image locally:', error);
      return { success: false, error: error.message };
    }
  };

  const uploadImage = async (uri) => {
    setIsUploading(true);
    setUploadStatus('Uploading image...');
    
    try {
      // Prepare additional data
      const additionalData = {
        type: 'emergency_photo',
        timestamp: new Date().toISOString(),
        userName: userName || 'Unknown User',
        latitude: location?.coords?.latitude || 'Unknown',
        longitude: location?.coords?.longitude || 'Unknown',
      };
      
      // Use the API function to upload the image
      const result = await uploadEmergencyImage(uri, additionalData);
      
      if (result.success) {
        setUploadStatus('Image uploaded successfully!');
        Alert.alert('Success', 'Image sent to emergency services');
      } else {
        // If the upload fails due to connectivity issues, save locally
        if (result.offline) {
          setUploadStatus('Server unreachable. Saving locally...');
          const saveResult = await saveImageLocally(uri);
          
          if (saveResult.success) {
            setSavedLocally(true);
            setUploadStatus('Image saved locally. Will upload when connection is available.');
            Alert.alert(
              'Saved Locally', 
              'The server is currently unreachable. Your image has been saved locally and will be uploaded when connection is restored.'
            );
          } else {
            throw new Error(`Failed to save locally: ${saveResult.error}`);
          }
        } else {
          throw new Error(result.error || 'Unknown error occurred');
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('Upload failed: ' + error.message);
      
      // Try to save locally if we haven't already tried
      if (!savedLocally) {
        try {
          setUploadStatus('Saving image locally instead...');
          const saveResult = await saveImageLocally(uri);
          
          if (saveResult.success) {
            setSavedLocally(true);
            setUploadStatus('Image saved locally due to error.');
            Alert.alert(
              'Saved Locally', 
              'There was an error uploading to the server. Your image has been saved locally.'
            );
          } else {
            Alert.alert('Error', 'Could not upload or save the image. ' + error.message);
          }
        } catch (saveError) {
          console.error('Failed to save locally after upload error:', saveError);
          Alert.alert('Error', 'Could not upload or save the image locally.');
        }
      } else {
        Alert.alert('Upload Failed', 'Could not send the image to the server. ' + error.message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewContainer}>
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={openCamera}
          disabled={isUploading}
        >
          <Text style={styles.buttonText}>
            {isUploading ? 'Processing...' : capturedImage ? 'Take Another Photo' : 'Open Camera'}
          </Text>
        </TouchableOpacity>
        
        {isUploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#4a90e2" />
            <Text style={styles.uploadingText}>{uploadStatus}</Text>
          </View>
        )}
        
        {capturedImage && !isUploading && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: capturedImage }} style={styles.preview} />
            <Text style={styles.previewText}>
              {uploadStatus || 'Photo captured successfully!'}
            </Text>
            {savedLocally && (
              <View style={styles.savedLocallyBadge}>
                <Text style={styles.savedLocallyText}>Saved Locally</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  previewContainer: {
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imagePreview: {
    marginTop: 15,
    alignItems: 'center',
    position: 'relative',
  },
  preview: {
    width: 300,
    height: 300,
    borderRadius: 8,
    marginVertical: 10,
  },
  previewText: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  uploadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  savedLocallyBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  savedLocallyText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default CameraComponent; 