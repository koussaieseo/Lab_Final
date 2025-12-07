#!/usr/bin/env node

/**
 * Comprehensive API Route Testing Script
 * Tests all documented routes from README.md
 * Usage: node test_api_routes.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_BASE_URL = `${BASE_URL}/api`;
const TEST_RESULTS = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Test data
const timestamp = Date.now();
let testUser = {
  name: 'Test User',
  email: `testuser${timestamp}@example.com`,
  username: `testuser${timestamp}`,
  password: 'testpassword123',
  bio: 'Test user for API testing'
};

let authToken = null;
let testUserId = null;
let testPostId = null;
let testCommentId = null;
let testNotificationId = null;

// Helper function to add delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  // Add delay to avoid rate limiting
  await delay(500);
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Helper function to log test results
function logTest(testName, result) {
  TEST_RESULTS.total++;
  if (result.success) {
    TEST_RESULTS.passed++;
    console.log(`✅ ${testName}`);
  } else {
    TEST_RESULTS.failed++;
    console.log(`❌ ${testName}`);
    console.log(`   Error: ${JSON.stringify(result.error)}`);
    TEST_RESULTS.errors.push({ test: testName, error: result.error });
  }
}

// Test Authentication Routes
async function testAuthRoutes() {
  console.log('\n🗝️  Testing Authentication Routes...');

  // Test Register
  console.log('\n  📋 Testing Register...');
  const registerResult = await makeRequest('POST', '/auth/register', testUser);
  logTest('POST /auth/register', registerResult);
  if (registerResult.success) {
    testUserId = registerResult.data.user._id;
  } else if (registerResult.error.message === 'User already exists') {
    console.log('  ℹ️  User already exists, will use login to get user ID');
  }

  // Test Login
  console.log('\n  🔐 Testing Login...');
  const loginResult = await makeRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  logTest('POST /auth/login', loginResult);
  if (loginResult.success) {
    authToken = loginResult.data.token;
  }

  // Test Get Current User
  console.log('\n  👤 Testing Get Current User...');
  const meResult = await makeRequest('GET', '/auth/me');
  logTest('GET /auth/me', meResult);
  if (meResult.success && !testUserId) {
    testUserId = meResult.data.user._id;
  }

  // Test Update Profile
  console.log('\n  ✏️  Testing Update Profile...');
  const updateResult = await makeRequest('PUT', '/auth/profile', {
    name: 'Updated Test User',
    bio: 'Updated bio for testing'
  });
  logTest('PUT /auth/profile', updateResult);
}

// Test User Routes
async function testUserRoutes() {
  console.log('\n👥 Testing User Routes...');

  // Test Get User Profile
  console.log('\n  📄 Testing Get User Profile...');
  const getUserResult = await makeRequest('GET', `/users/${testUserId}`);
  logTest(`GET /users/${testUserId}`, getUserResult);

  // Test Search Users
  console.log('\n  🔍 Testing Search Users...');
  const searchResult = await makeRequest('GET', '/users/search?q=test&type=users&page=1&limit=10');
  logTest('GET /users/search', searchResult);

  // Test Get User's Followers
  console.log('\n  👥 Testing Get User Followers...');
  const followersResult = await makeRequest('GET', `/users/${testUserId}/followers?page=1&limit=20`);
  logTest(`GET /users/${testUserId}/followers`, followersResult);

  // Test Get User's Following
  console.log('\n  👣 Testing Get User Following...');
  const followingResult = await makeRequest('GET', `/users/${testUserId}/following?page=1&limit=20`);
  logTest(`GET /users/${testUserId}/following`, followingResult);

  // Test Get User's Posts
  console.log('\n  📝 Testing Get User Posts...');
  const userPostsResult = await makeRequest('GET', `/users/${testUserId}/posts?page=1&limit=10`);
  logTest(`GET /users/${testUserId}/posts`, userPostsResult);
}

// Test Post Routes
async function testPostRoutes() {
  console.log('\n📝 Testing Post Routes...');

  // Test Create Post
  console.log('\n  ✨ Testing Create Post...');
  const createPostResult = await makeRequest('POST', '/posts', {
    content: 'This is a test post for API testing',
    tags: ['test', 'api'],
    isPublic: true
  });
  logTest('POST /posts', createPostResult);
  if (createPostResult.success) {
    testPostId = createPostResult.data.post._id;
  }

  // Test Get Feed
  console.log('\n  📰 Testing Get Feed...');
  const feedResult = await makeRequest('GET', '/posts/feed?page=1&limit=10');
  logTest('GET /posts/feed', feedResult);

  // Test Get Discover Feed
  console.log('\n  🌍 Testing Get Discover Feed...');
  const discoverResult = await makeRequest('GET', '/posts/discover?page=1&limit=10');
  logTest('GET /posts/discover', discoverResult);

  if (testPostId) {
    // Test Get Single Post
    console.log('\n  📄 Testing Get Single Post...');
    const getPostResult = await makeRequest('GET', `/posts/${testPostId}`);
    logTest(`GET /posts/${testPostId}`, getPostResult);

    // Test Update Post
    console.log('\n  ✏️  Testing Update Post...');
    const updatePostResult = await makeRequest('PUT', `/posts/${testPostId}`, {
      content: 'Updated test post content',
      tags: ['updated', 'test'],
      isPublic: false
    });
    logTest(`PUT /posts/${testPostId}`, updatePostResult);

    // Test Like Post
    console.log('\n  ❤️  Testing Like Post...');
    const likePostResult = await makeRequest('POST', `/posts/${testPostId}/like`);
    logTest(`POST /posts/${testPostId}/like`, likePostResult);

    // Test Unlike Post
    console.log('\n  💔 Testing Unlike Post...');
    const unlikePostResult = await makeRequest('DELETE', `/posts/${testPostId}/like`);
    logTest(`DELETE /posts/${testPostId}/like`, unlikePostResult);

    // Test Dislike Post
    console.log('\n  👎 Testing Dislike Post...');
    const dislikePostResult = await makeRequest('POST', `/posts/${testPostId}/dislike`);
    logTest(`POST /posts/${testPostId}/dislike`, dislikePostResult);

    // Test Remove Dislike
    console.log('\n  ✅ Testing Remove Dislike...');
    const removeDislikeResult = await makeRequest('DELETE', `/posts/${testPostId}/dislike`);
    logTest(`DELETE /posts/${testPostId}/dislike`, removeDislikeResult);
  }
}

// Test Comment Routes
async function testCommentRoutes() {
  console.log('\n💬 Testing Comment Routes...');

  if (testPostId) {
    // Test Create Comment
    console.log('\n  ➕ Testing Create Comment...');
    const createCommentResult = await makeRequest('POST', `/comments/posts/${testPostId}`, {
      content: 'This is a test comment'
    });
    logTest(`POST /comments/posts/${testPostId}`, createCommentResult);
    if (createCommentResult.success) {
      testCommentId = createCommentResult.data.comment._id;
    }

    // Test Get Comments for Post
    console.log('\n  📋 Testing Get Comments for Post...');
    const getCommentsResult = await makeRequest('GET', `/comments/posts/${testPostId}?page=1&limit=20`);
    logTest(`GET /comments/posts/${testPostId}`, getCommentsResult);

    if (testCommentId) {
      // Test Update Comment
      console.log('\n  ✏️  Testing Update Comment...');
      const updateCommentResult = await makeRequest('PUT', `/comments/${testCommentId}`, {
        content: 'Updated test comment'
      });
      logTest(`PUT /comments/${testCommentId}`, updateCommentResult);

      // Test Like Comment
      console.log('\n  ❤️  Testing Like Comment...');
      const likeCommentResult = await makeRequest('POST', `/comments/${testCommentId}/like`);
      logTest(`POST /comments/${testCommentId}/like`, likeCommentResult);

      // Test Unlike Comment
      console.log('\n  💔 Testing Unlike Comment...');
      const unlikeCommentResult = await makeRequest('DELETE', `/comments/${testCommentId}/like`);
      logTest(`DELETE /comments/${testCommentId}/like`, unlikeCommentResult);

      // Test Delete Comment
      console.log('\n  🗑️  Testing Delete Comment...');
      const deleteCommentResult = await makeRequest('DELETE', `/comments/${testCommentId}`);
      logTest(`DELETE /comments/${testCommentId}`, deleteCommentResult);
    }
  }
}

// Test Relationship Routes
async function testRelationshipRoutes() {
  console.log('\n🔗 Testing Relationship Routes...');

  // Create a second test user to test relationships
  const secondUser = {
    name: 'Second Test User',
    email: 'seconduser@example.com',
    username: 'seconduser',
    password: 'testpassword123',
    bio: 'Second test user for relationship testing'
  };

  console.log('\n  👤 Creating second test user...');
  const registerSecondResult = await makeRequest('POST', '/auth/register', secondUser);
  let secondUserId = null;

  if (registerSecondResult.success) {
    secondUserId = registerSecondResult.data.user._id;

    // Test Follow User
    console.log('\n  ➕ Testing Follow User...');
    const followResult = await makeRequest('POST', `/relationships/follow/${secondUserId}`);
    logTest(`POST /relationships/follow/${secondUserId}`, followResult);

    // Test Get Relationship Status
    console.log('\n  📊 Testing Get Relationship Status...');
    const statusResult = await makeRequest('GET', `/relationships/status/${secondUserId}`);
    logTest(`GET /relationships/status/${secondUserId}`, statusResult);

    // Test Unfollow User
    console.log('\n  ➖ Testing Unfollow User...');
    const unfollowResult = await makeRequest('DELETE', `/relationships/follow/${secondUserId}`);
    logTest(`DELETE /relationships/follow/${secondUserId}`, unfollowResult);
  }
}

// Test Recommendation Routes
async function testRecommendationRoutes() {
  console.log('\n⭐ Testing Recommendation Routes...');

  // Test Get People You May Know
  console.log('\n  👥 Testing Get People You May Know...');
  const peopleResult = await makeRequest('GET', '/recommendations/people-you-may-know?limit=10');
  logTest('GET /recommendations/people-you-may-know', peopleResult);

  // Test Get Trending Users
  console.log('\n  🔥 Testing Get Trending Users...');
  const trendingResult = await makeRequest('GET', '/recommendations/trending-users?limit=10');
  logTest('GET /recommendations/trending-users', trendingResult);

  // Note: Connection path test would require a more complex graph setup
  // Skipping for basic testing
}

// Test Media Routes
async function testMediaRoutes() {
  console.log('\n📸 Testing Media Routes...');

  // Note: Media upload would require actual file handling
  // For now, we'll test the GET endpoint if any media exists
  console.log('\n  📁 Testing Media Routes (basic test - file upload requires actual files)');
  console.log('  ⚠️  Media upload tests skipped - requires file handling setup');
}

// Test Notification Routes
async function testNotificationRoutes() {
  console.log('\n🔔 Testing Notification Routes...');

  // Test Get Notifications
  console.log('\n  📋 Testing Get Notifications...');
  const notificationsResult = await makeRequest('GET', '/notifications?page=1&limit=20');
  logTest('GET /notifications', notificationsResult);

  if (notificationsResult.success && notificationsResult.data.notifications.length > 0) {
    testNotificationId = notificationsResult.data.notifications[0].id;

    // Test Get Unread Count
    console.log('\n  📊 Testing Get Unread Notifications Count...');
    const unreadCountResult = await makeRequest('GET', '/notifications/unread-count');
    logTest('GET /notifications/unread-count', unreadCountResult);

    // Test Mark Notification as Read
    console.log('\n  ✅ Testing Mark Notification as Read...');
    const markReadResult = await makeRequest('PATCH', `/notifications/${testNotificationId}/read`);
    logTest(`PATCH /notifications/${testNotificationId}/read`, markReadResult);

    // Test Mark All as Read
    console.log('\n  ✅ Testing Mark All Notifications as Read...');
    const markAllResult = await makeRequest('PATCH', '/notifications/mark-all-read');
    logTest('PATCH /notifications/mark-all-read', markAllResult);
  }
}

// Cleanup function
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete test post if created
  if (testPostId) {
    await makeRequest('DELETE', `/posts/${testPostId}`);
    console.log('  🗑️  Deleted test post');
  }

  // Delete test user if created
  if (testUserId) {
    // Note: User deletion might not be implemented in the API
    console.log('  ℹ️  Test user cleanup skipped - may require admin endpoint');
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Route Testing');
  console.log('==============================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('Test User:', testUser.email);

  try {
    // Run all test suites
    await testAuthRoutes();
    await testUserRoutes();
    await testPostRoutes();
    await testCommentRoutes();
    await testRelationshipRoutes();
    await testRecommendationRoutes();
    await testMediaRoutes();
    await testNotificationRoutes();

    // Print summary
    console.log('\n📊 Test Summary');
    console.log('==================');
    console.log(`Total Tests: ${TEST_RESULTS.total}`);
    console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
    console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
    console.log(`Success Rate: ${((TEST_RESULTS.passed / TEST_RESULTS.total) * 100).toFixed(1)}%`);

    if (TEST_RESULTS.failed > 0) {
      console.log('\n❌ Failed Tests:');
      TEST_RESULTS.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.test}`);
        console.log(`     Error: ${JSON.stringify(error.error)}`);
      });
    }

    // Cleanup
    await cleanup();

    console.log('\n🎉 API Route Testing Completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Check if axios is available
function checkDependencies() {
  try {
    require.resolve('axios');
    return true;
  } catch (error) {
    console.error('❌ axios is not installed. Please run: npm install axios');
    return false;
  }
}

// Run tests if dependencies are available
if (checkDependencies()) {
  // Check if server is running
  console.log('🔍 Checking if backend server is running...');
  
  axios.get(`${BASE_URL}/health`)
    .then(() => {
      console.log('✅ Backend server is running');
      runAllTests();
    })
    .catch(() => {
      console.error('❌ Backend server is not running. Please start it first:');
      console.error('   cd backend && npm run dev');
      process.exit(1);
    });
}