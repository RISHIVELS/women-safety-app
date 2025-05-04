/**
 * API utilities for the women's safety app
 */

import { API_URL } from './config';

/**
 * Send an emergency alert to the backend server
 * @param {Object} data - Alert data including name and location
 * @returns {Promise<Object>} - Response from the server
 */
export const sendEmergencyAlert = async (data) => {
  try {
    console.log('Sending data to backend:', data);
    
    // Set a timeout for the fetch request (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_URL}/trigger-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    // Try to parse the response as JSON
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      // If the response isn't valid JSON, use text instead
      responseData = { message: await response.text() };
    }
    
    console.log('Received response from backend:', responseData);
    return { success: true, data: responseData };
  } catch (error) {
    console.error('Error sending emergency alert:', error);
    
    // Check if it was a timeout
    if (error.name === 'AbortError') {
      console.log('Request timed out - server might be down or unreachable');
      return { 
        success: false, 
        error: 'Connection timed out. Server might be down or unreachable.',
        offline: true
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      offline: error.message.includes('Network') || error.message.includes('fetch')
    };
  }
}; 

/**
 * Upload an image to the backend server
 * @param {string} imageUri - Local URI of the image
 * @param {Object} additionalData - Additional data to send with the image
 * @returns {Promise<Object>} - Response from the server
 */
export const uploadEmergencyImage = async (imageUri, additionalData = {}) => {
  try {
    console.log('Preparing to upload image to backend:', imageUri);
    
    // Create form data
    const formData = new FormData();
    
    // Get filename from uri
    const uriParts = imageUri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    
    // Append image to form data
    formData.append('image', {
      uri: imageUri,
      name: fileName,
      type: 'image/jpeg', // Assuming JPEG format
    });
    
    // Add any additional data
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });
    
    // Set a timeout for the fetch request (10 seconds for image upload)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_URL}/upload-image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    // Try to parse the response as JSON
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      // If the response isn't valid JSON, use text instead
      responseData = { message: await response.text() };
    }
    
    console.log('Received image upload response from backend:', responseData);
    return { success: true, data: responseData };
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Check if it was a timeout
    if (error.name === 'AbortError') {
      console.log('Image upload timed out - server might be down or unreachable');
      return { 
        success: false, 
        error: 'Connection timed out. Server might be down or unreachable.',
        offline: true
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      offline: error.message.includes('Network') || error.message.includes('fetch')
    };
  }
}; 