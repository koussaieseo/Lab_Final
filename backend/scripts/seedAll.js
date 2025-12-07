#!/usr/bin/env node

/**
 * Simplified Unified Database Seeding Script
 * Single function to seed both MongoDB and Neo4j databases
 * Usage: node scripts/seedAll.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const { User, Post, Comment, Media, Notification } = require('../src/models');
const neo4jService = require('../src/services/neo4jService');
const mongoService = require('../src/services/mongodbService');

// Static Configuration
const config = {
  mode: 'rich',  // 'simple' or 'rich'
  usersCount: 15,  // Number of users to create
  postsCount: 45, // Number of posts to create
  reset: true     // Reset collections before seeding
};

// Simple user data
const simpleUsers = [
  { name: 'Alice Johnson', username: 'alice_j', email: 'alice@example.com', bio: 'Software engineer' },
  { name: 'Bob Smith', username: 'bob_smith', email: 'bob@example.com', bio: 'Full-stack developer' },
  { name: 'Carol Davis', username: 'carol_d', email: 'carol@example.com', bio: 'UX designer' },
  { name: 'David Wilson', username: 'david_w', email: 'david@example.com', bio: 'Data scientist' },
  { name: 'Emma Brown', username: 'emma_b', email: 'emma@example.com', bio: 'Product manager' }
];

// Rich user data templates
const richUserTemplates = [
  { name: 'Alex Chen', username: 'alex_chen', bio: 'AI researcher and tech enthusiast', location: 'San Francisco, CA' },
  { name: 'Maria Garcia', username: 'maria_g', bio: 'Senior software engineer | Open source contributor', location: 'New York, NY' },
  { name: 'James Taylor', username: 'james_t', bio: 'Full-stack developer | React & Node.js expert', location: 'Austin, TX' },
  { name: 'Sarah Lee', username: 'sarah_lee', bio: 'UX/UI designer | Creating beautiful experiences', location: 'Seattle, WA' },
  { name: 'Michael Johnson', username: 'mike_j', bio: 'Data scientist | Machine learning enthusiast', location: 'Boston, MA' }
];

// Sample post content
const simplePosts = [
  "Just finished a great project! 🎉",
  "Learning new technologies every day.",
  "Great team meeting today!",
  "Excited about the future of tech.",
  "Working on something amazing."
];

const richPosts = [
  "Just launched our new AI-powered feature! 🚀 The response has been incredible. Thanks to everyone who contributed to this milestone.",
  "After months of development, our open-source library hit 10k stars on GitHub! 🌟 Grateful for this amazing community.",
  "Key insights from today's tech conference: AI is transforming every industry, and we're just getting started. The future is bright! 💡",
  "Completed my certification in cloud architecture! Next stop: building scalable systems that make a difference. ☁️",
  "Our startup just secured Series A funding! 🎯 Couldn't have done it without this amazing team and supportive community."
];

// Main seeding function
async function seedAll() {
  console.log(`🚀 Starting ${config.mode} database seeding...`);
  console.log(`📊 Configuration: ${config.usersCount} users, ${config.postsCount} posts`);
  
  const startTime = Date.now();
  
  try {
    // Connect to databases
    console.log('🔗 Connecting to databases...');
    await mongoService.connect();
    console.log('✅ Connected to MongoDB');
    
    try {
      await neo4jService.connect();
      console.log('✅ Connected to Neo4j');
    } catch (error) {
      console.log('⚠️  Neo4j connection failed, continuing with MongoDB only');
    }
    
    // Reset if requested
    if (config.reset) {
      console.log('🗑️  Resetting collections...');
      await Promise.all([
        User.deleteMany({}),
        Post.deleteMany({}),
        Comment.deleteMany({}),
        Media.deleteMany({}),
        Notification.deleteMany({})
      ]);
      console.log('✅ Collections reset');
    }
    
    // Create users
    console.log(`👥 Creating ${config.usersCount} users...`);
    const users = [];
    const userTemplates = config.mode === 'simple' ? simpleUsers : richUserTemplates;
    
    for (let i = 0; i < config.usersCount; i++) {
      const template = userTemplates[i % userTemplates.length];
      const user = new User({
        _id: randomUUID(),
        name: template.name,
        username: `${template.username}_${i}`,
        email: `${template.username}_${i}@example.com`,
        password: bcrypt.hashSync('password123', 10),
        bio: template.bio,
        location: template.location || 'USA',
        website: `https://${template.username}-blog.com`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${template.username}`,
        interests: ['Technology', 'Design', 'Business'].slice(0, (i % 3) + 1),
        isVerified: i % 6 === 0,
        isActive: true,
        createdAt: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000))
      });
      
      await user.save();
      users.push(user);
      
      // Create user in Neo4j
      if (neo4jService.driver) {
        await neo4jService.createUser({
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio
        });
      }
    }
    console.log(`✅ Created ${users.length} users`);
    
    // Create posts
    console.log(`📝 Creating ${config.postsCount} posts...`);
    const posts = [];
    const postTemplates = config.mode === 'simple' ? simplePosts : richPosts;
    
    for (let i = 0; i < config.postsCount; i++) {
      const author = users[i % users.length];
      const content = postTemplates[i % postTemplates.length];
      const hasMedia = config.mode === 'rich' && i % 3 === 0;
      
      const post = new Post({
        author: author._id,
        content: `${content} #${['tech', 'development', 'design'][i % 3]}`,
        hashtags: [`#${['tech', 'development', 'design'][i % 3]}`],
        media: hasMedia ? [{
          type: 'image',
          url: `https://picsum.photos/800/600?random=${i}`,
          metadata: { width: 800, height: 600 }
        }] : [],
        likes: [],
        comments: [],
        isPublic: true,
        viewCount: (i + 1) * 50,
        createdAt: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000))
      });
      
      await post.save();
      posts.push(post);
      
      // Create post in Neo4j
      if (neo4jService.driver) {
        // Convert ObjectId to string for Neo4j compatibility
        await neo4jService.createPost(post._id.toString(), post.author, []);
      }
    }
    console.log(`✅ Created ${posts.length} posts`);
    
    // Create relationships and interactions
    if (config.mode === 'rich') {
      console.log('🔗 Creating relationships and interactions...');
      
      // Create follow relationships
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        // Create more varied follow patterns - some users follow more, some less
        const followCount = Math.min(Math.floor(Math.random() * 5) + 2, users.length - 1);
        let followingCount = 0;
        
        // Create follow relationships with users who have similar interests
        const potentialTargets = users.filter(u => 
          u._id !== user._id && 
          (u.interests.some(interest => user.interests.includes(interest)) || Math.random() > 0.6)
        );
        
        const targets = potentialTargets.slice(0, followCount);
        
        for (const targetUser of targets) {
          followingCount++;
          
          // Neo4j: Create follow relationship
          if (neo4jService.driver) {
            try {
              await neo4jService.followUser(user._id, targetUser._id);
              console.log(`✅ Created follow relationship: ${user.username} -> ${targetUser.username}`);
            } catch (error) {
              console.log(`⚠️  Failed to create follow relationship: ${user.username} -> ${targetUser.username}`, error.message);
            }
          }
        }
        
        // Update user's following count in MongoDB
        if (followingCount > 0) {
          await User.updateOne(
            { _id: user._id },
            { $set: { followingCount: followingCount } }
          );
        }
      }
      
      // Create additional random connections to build a more connected network
      console.log('🌐 Creating additional network connections...');
      if (neo4jService.driver) {
        // Create mutual connections - if A follows B, make B follow A sometimes
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          for (let j = i + 1; j < users.length; j++) {
            const targetUser = users[j];
            // 30% chance of creating mutual follow relationship
            if (Math.random() > 0.7) {
              try {
                await neo4jService.followUser(user._id, targetUser._id);
                await neo4jService.followUser(targetUser._id, user._id);
                console.log(`✅ Created mutual follow: ${user.username} ↔ ${targetUser.username}`);
              } catch (error) {
                console.log(`⚠️  Failed to create mutual follow: ${user.username} ↔ ${targetUser.username}`, error.message);
              }
            }
          }
        }
        
        // Create additional random one-way connections
        for (let i = 0; i < Math.min(20, users.length * 2); i++) {
          const user1 = users[Math.floor(Math.random() * users.length)];
          const user2 = users[Math.floor(Math.random() * users.length)];
          
          if (user1._id !== user2._id && Math.random() > 0.5) {
            try {
              await neo4jService.followUser(user1._id, user2._id);
              console.log(`✅ Created additional follow: ${user1.username} -> ${user2.username}`);
            } catch (error) {
              console.log(`⚠️  Failed to create additional follow: ${user1.username} -> ${user2.username}`, error.message);
            }
          }
        }
      }
      
      // Update followers count for all users based on Neo4j relationships
      if (neo4jService.driver) {
        console.log('📊 Updating followers counts...');
        for (const user of users) {
          try {
            const followers = await neo4jService.getFollowers(user._id);
            const following = await neo4jService.getFollowing(user._id);
            
            if (followers.length > 0 || following.length > 0) {
              await User.updateOne(
                { _id: user._id },
                { 
                  $set: { 
                    followersCount: followers.length,
                    followingCount: following.length 
                  } 
                }
              );
              console.log(`✅ Updated counts for ${user.username}: ${followers.length} followers, ${following.length} following`);
            }
          } catch (error) {
            console.log(`⚠️  Failed to update counts for ${user.username}:`, error.message);
          }
        }
      }
      
      // Create likes and comments
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const likeCount = Math.min(5, users.length);
        const commentCount = Math.min(3, users.length);
        
        // Add likes
        for (let j = 0; j < likeCount; j++) {
          const liker = users[j];
          if (liker._id !== post.author) {
            post.likes.push({
              user: liker._id,
              type: 'like',
              createdAt: new Date(Date.now() - (j * 24 * 60 * 60 * 1000))
            });
            
            // Neo4j: Create like relationship
            if (neo4jService.driver) {
              await neo4jService.likePost(liker._id, post._id);
            }
          }
        }
        
        // Add comments
        for (let j = 0; j < commentCount; j++) {
          const commenter = users[(j + 1) % users.length];
          if (commenter._id !== post.author) {
            const comment = new Comment({
              post: post._id,
              author: commenter._id,
              content: ['Great post!', 'Interesting perspective!', 'Thanks for sharing!'][j % 3],
              likes: [],
              replies: [],
              createdAt: new Date(Date.now() - (j * 2 * 24 * 60 * 60 * 1000))
            });
            
            await comment.save();
            post.comments.push(comment._id);
          }
        }
        
        await post.save();
      }
      
      console.log('✅ Created relationships and interactions');
    }
    
    // Create notifications
    if (config.mode === 'rich') {
      console.log('🔔 Creating notifications...');
      const notifications = [];
      
      for (let i = 0; i < users.length * 2; i++) {
        const sender = users[i % users.length];
        const recipient = users[(i + 1) % users.length];
        const types = ['follow', 'like', 'comment'];
        
        if (sender._id !== recipient._id) {
          const notification = new Notification({
            recipient: recipient._id,
            sender: sender._id,
            type: types[i % 3],
            message: `${sender.name} ${types[i % 3]}ed your post`,
            isRead: i % 2 === 0,
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
          });
          
          await notification.save();
          notifications.push(notification);
        }
      }
      
      console.log(`✅ Created ${notifications.length} notifications`);
    }
    
    // Verify Neo4j relationships
    if (neo4jService.driver) {
      console.log('🔍 Verifying Neo4j relationships...');
      try {
        const session = neo4jService.getSession();
        const result = await session.run(`
          MATCH (u:User)-[r:FOLLOWS]->(t:User)
          RETURN count(r) as relationshipCount
        `);
        const relationshipCount = result.records[0].get('relationshipCount').toNumber();
        console.log(`✅ Neo4j contains ${relationshipCount} follow relationships`);
        
        // Test a specific user for recommendations
        if (users.length > 0) {
          const testUser = users[0];
          const testResult = await session.run(`
            MATCH (user:User {id: $userId})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(potentialFriend:User)
            WHERE NOT (user)-[:FOLLOWS]->(potentialFriend)
            AND user <> potentialFriend
            RETURN potentialFriend.id as userId, count(*) as mutualConnections
            LIMIT 5
          `, { userId: testUser._id });
          
          console.log(`✅ Found ${testResult.records.length} potential recommendations for ${testUser.username}`);
          testResult.records.forEach(record => {
            console.log(`   - User: ${record.get('userId')}, Mutual connections: ${record.get('mutualConnections').toNumber()}`);
          });
        }
        
        await session.close();
      } catch (error) {
        console.log('⚠️  Failed to verify Neo4j relationships:', error.message);
      }
    }
      const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Created: ${config.usersCount} users, ${posts.length} posts`);
    console.log(`🔧 Mode: ${config.mode} (${config.mode === 'simple' ? 'Basic data' : 'Rich interactions'})`);
    if (users.length > 0) {
      console.log('\n🔑 Sample login credentials:');
      console.log(`Email: ${users[0].email}, Password: password123`);
      console.log(`Email: ${users[1]?.email || 'user2@example.com'}, Password: password123`);
    }
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    try {
      await mongoose.connection.close();
      if (neo4jService.driver) {
        await neo4jService.driver.close();
      }
    } catch (error) {
      console.log('⚠️  Error closing connections:', error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  seedAll();
}

module.exports = { seedAll };