#!/usr/bin/env node

// Simulate browser registration and login flow
const BASE_URL = 'http://localhost:3000';

async function testBrowserAuth() {
  console.log('Testing browser authentication flow...');

  // Test 1: Register a new user (simulating browser behavior)
  try {
    console.log('\n1. Testing registration...');
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // This is important for cookies
      body: JSON.stringify({
        fullName: 'Browser Test User',
        username: 'browseruser',
        email: 'browseruser@test.com',
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

  // Test 2: Check authentication status immediately after registration
  try {
    console.log('\n2. Testing /api/auth/me after registration...');
    const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      credentials: 'include'
    });

    if (meResponse.ok) {
      const userData = await meResponse.json();
      console.log('✅ Auth check successful:', userData.email);
    } else {
      console.log('❌ Auth check failed:', meResponse.status);
    }
  } catch (error) {
    console.log('❌ Auth check error:', error.message);
  }

  // Test 3: Login with the same user
  try {
    console.log('\n3. Testing login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'browseruser@test.com',
        password: 'password123'
      })
    });

    if (loginResponse.ok) {
      const userData = await loginResponse.json();
      console.log('✅ Login successful:', userData.email);
    } else {
      const error = await loginResponse.text();
      console.log('❌ Login failed:', loginResponse.status, error);
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
  }

  // Test 4: Check authentication status after login
  try {
    console.log('\n4. Testing /api/auth/me after login...');
    const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      credentials: 'include'
    });

    if (meResponse.ok) {
      const userData = await meResponse.json();
      console.log('✅ Final auth check successful:', userData.email);
    } else {
      console.log('❌ Final auth check failed:', meResponse.status);
    }
  } catch (error) {
    console.log('❌ Final auth check error:', error.message);
  }
}

testBrowserAuth();
