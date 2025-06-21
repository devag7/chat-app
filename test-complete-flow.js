#!/usr/bin/env node

// Complete simulation of user registration and app usage
const BASE_URL = 'http://localhost:3000';

class BrowserSession {
  constructor() {
    this.cookies = new Map();
  }

  setCookieFromResponse(response) {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      // Parse the cookie
      const cookiePart = setCookie.split(';')[0];
      const [name, value] = cookiePart.split('=');
      this.cookies.set(name, value);
      console.log(`🍪 Set cookie: ${name}=${value}`);
    }
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return {};
    
    const cookieString = Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    
    return { 'Cookie': cookieString };
  }

  async fetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getCookieHeader(),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    this.setCookieFromResponse(response);
    return response;
  }
}

async function simulateCompleteUserFlow() {
  console.log('🚀 Simulating complete user flow...');
  
  const session = new BrowserSession();

  // Step 1: Initial page load - check auth status
  console.log('\n1️⃣ Initial page load - checking auth status...');
  try {
    const authResponse = await session.fetch(`${BASE_URL}/api/auth/me`);
    console.log('Initial auth check status:', authResponse.status);
    
    if (authResponse.ok) {
      const user = await authResponse.json();
      console.log('✅ Already logged in as:', user.email);
      return; // User already logged in, exit test
    } else {
      console.log('👤 No user logged in, proceeding with registration...');
    }
  } catch (error) {
    console.log('❌ Initial auth check failed:', error.message);
  }

  // Step 2: User registration
  console.log('\n2️⃣ User registration...');
  let userData = null;
  try {
    const registerResponse = await session.fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Complete Flow User',
        username: 'completeflow',
        email: 'completeflow@test.com',
        password: 'password123'
      })
    });

    if (registerResponse.ok) {
      userData = await registerResponse.json();
      console.log('✅ Registration successful:', userData.email);
      console.log('📋 User data received:', userData.username);
    } else {
      const error = await registerResponse.text();
      console.log('❌ Registration failed:', registerResponse.status, error);
      return;
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
    return;
  }

  // Step 3: Immediate auth check (simulating setQueryData + immediate query)
  console.log('\n3️⃣ Immediate auth verification...');
  try {
    const authResponse = await session.fetch(`${BASE_URL}/api/auth/me`);
    
    if (authResponse.ok) {
      const user = await authResponse.json();
      console.log('✅ Immediate auth successful:', user.email);
    } else {
      console.log('❌ Immediate auth failed:', authResponse.status);
    }
  } catch (error) {
    console.log('❌ Immediate auth error:', error.message);
  }

  // Step 4: Load initial app data (simulating what happens after login)
  console.log('\n4️⃣ Loading initial app data...');
  try {
    const [usersResponse, chatsResponse] = await Promise.all([
      session.fetch(`${BASE_URL}/api/users`),
      session.fetch(`${BASE_URL}/api/chats`)
    ]);

    console.log('Users API status:', usersResponse.status);
    console.log('Chats API status:', chatsResponse.status);

    if (usersResponse.ok && chatsResponse.ok) {
      const users = await usersResponse.json();
      const chats = await chatsResponse.json();
      console.log('✅ App data loaded successfully');
      console.log(`📊 Found ${users.length} users, ${chats.length} chats`);
    } else {
      console.log('❌ Failed to load app data');
    }
  } catch (error) {
    console.log('❌ App data loading error:', error.message);
  }

  // Step 5: Delayed auth check (simulating the setTimeout invalidation)
  console.log('\n5️⃣ Delayed auth check (100ms later)...');
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    const authResponse = await session.fetch(`${BASE_URL}/api/auth/me`);
    
    if (authResponse.ok) {
      const user = await authResponse.json();
      console.log('✅ Delayed auth successful:', user.email);
    } else {
      console.log('❌ Delayed auth failed:', authResponse.status);
    }
  } catch (error) {
    console.log('❌ Delayed auth error:', error.message);
  }

  // Step 6: Continuous app usage (simulating user interactions)
  console.log('\n6️⃣ Continuous app usage simulation...');
  for (let i = 0; i < 3; i++) {
    try {
      const [authResponse, usersResponse] = await Promise.all([
        session.fetch(`${BASE_URL}/api/auth/me`),
        session.fetch(`${BASE_URL}/api/users`)
      ]);

      console.log(`Request ${i + 1}: Auth=${authResponse.status}, Users=${usersResponse.status}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.log(`Request ${i + 1} error:`, error.message);
    }
  }

  console.log('\n🎉 Complete user flow simulation finished!');
}

simulateCompleteUserFlow();
