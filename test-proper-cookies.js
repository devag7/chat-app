#!/usr/bin/env node
import { CookieJar } from 'tough-cookie';
import fetch, { Request, Response } from 'node-fetch';

// Function to extract cookies from response headers
function getCookiesFromResponse(response) {
  const setCookieHeader = response.headers.get('set-cookie');
  if (!setCookieHeader) return [];
  return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
}

// Function to create a cookie string from an array of cookies
function createCookieString(cookies) {
  return cookies.map(cookie => cookie.split(';')[0]).join('; ');
}

async function testWithCookies() {
  console.log('Testing with proper cookie handling...');
  
  let cookies = [];
  const BASE_URL = 'http://localhost:3000';

  // Test 1: Register
  try {
    console.log('\n1. Testing registration with cookies...');
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Cookie Fix Test',
        username: 'cookiefix',
        email: 'cookiefix@test.com',
        password: 'password123'
      })
    });

    if (registerResponse.ok) {
      const userData = await registerResponse.json();
      console.log('✅ Registration successful:', userData.email);
      
      // Extract cookies from response
      const newCookies = getCookiesFromResponse(registerResponse);
      cookies = cookies.concat(newCookies);
      console.log('📋 Cookies received:', newCookies);
    } else {
      const error = await registerResponse.text();
      console.log('❌ Registration failed:', registerResponse.status, error);
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
  }

  // Test 2: Check auth with cookies
  try {
    console.log('\n2. Testing /api/auth/me with cookies...');
    const cookieString = createCookieString(cookies);
    console.log('🍪 Sending cookies:', cookieString);
    
    const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Cookie': cookieString
      }
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
}

testWithCookies();
