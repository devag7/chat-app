#!/usr/bin/env node

// Test that simulates browser session behavior
const BASE_URL = 'http://localhost:3000';

async function testSessionFlow() {
  console.log('Testing session flow simulation...');
  
  // Create a cookie jar to store cookies between requests
  let cookieJar = '';

  async function makeRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add cookies to request if we have them
    if (cookieJar) {
      headers['Cookie'] = cookieJar;
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Extract cookies from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      // Store the cookie for future requests
      cookieJar = setCookie.split(';')[0]; // Keep only the cookie value
      console.log('🍪 Cookie updated:', cookieJar);
    }
    
    return response;
  }

  // Test 1: Register a user
  try {
    console.log('\n1. Testing registration...');
    const registerResponse = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Session Test User',
        username: 'sessiontest',
        email: 'sessiontest@test.com',
        password: 'password123'
      })
    });

    if (registerResponse.ok) {
      const userData = await registerResponse.json();
      console.log('✅ Registration successful:', userData.email);
    } else {
      const error = await registerResponse.text();
      console.log('❌ Registration failed:', registerResponse.status, error);
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
  }

  // Test 2: Immediate auth check (simulating React Query)
  try {
    console.log('\n2. Testing immediate auth check...');
    const meResponse = await makeRequest(`${BASE_URL}/api/auth/me`);

    if (meResponse.ok) {
      const userData = await meResponse.json();
      console.log('✅ Immediate auth check successful:', userData.email);
    } else {
      console.log('❌ Immediate auth check failed:', meResponse.status);
    }
  } catch (error) {
    console.log('❌ Immediate auth check error:', error.message);
  }

  // Test 3: Delayed auth check (simulating the setTimeout)
  try {
    console.log('\n3. Testing delayed auth check (100ms later)...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const meResponse = await makeRequest(`${BASE_URL}/api/auth/me`);

    if (meResponse.ok) {
      const userData = await meResponse.json();
      console.log('✅ Delayed auth check successful:', userData.email);
    } else {
      console.log('❌ Delayed auth check failed:', meResponse.status);
    }
  } catch (error) {
    console.log('❌ Delayed auth check error:', error.message);
  }

  // Test 4: Multiple subsequent requests (simulating normal app usage)
  try {
    console.log('\n4. Testing multiple subsequent requests...');
    
    const requests = [
      makeRequest(`${BASE_URL}/api/auth/me`),
      makeRequest(`${BASE_URL}/api/users`),
      makeRequest(`${BASE_URL}/api/chats`)
    ];
    
    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(r => r.ok ? r.json() : r.text()));
    
    console.log('Auth status:', responses[0].status);
    console.log('Users status:', responses[1].status);
    console.log('Chats status:', responses[2].status);
    
    if (responses.every(r => r.ok)) {
      console.log('✅ All subsequent requests successful');
    } else {
      console.log('❌ Some subsequent requests failed');
    }
  } catch (error) {
    console.log('❌ Subsequent requests error:', error.message);
  }
}

testSessionFlow();
