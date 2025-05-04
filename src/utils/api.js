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