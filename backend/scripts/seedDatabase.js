#!/usr/bin/env node

/**
 * Comprehensive Database Seeding Script
 * Seeds both MongoDB and Neo4j databases with realistic social network data
 * Usage: node scripts/seedDatabase.js [--reset] [--users N] [--posts N]
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const { User, Post, Comment, Media, Notification } = require('../src/models');
const neo4jService = require('../src/services/neo4jService');
const mongoService = require('../src/services/mongodbService');

// Configuration
const config = {
  reset: process.argv.includes('--reset'),
  usersCount: parseInt(process.argv.find(arg => arg.startsWith('--users='))?.split('=')[1]) || 15,
  postsCount: parseInt(process.argv.find(arg => arg.startsWith('--posts='))?.split('=')[1]) || 50,
  maxCommentsPerPost: 8,
  maxLikesPerPost: 20,
  maxFollowersPerUser: 10,
  maxMediaPerPost: 3,
  hashtags: ['tech', 'development', 'design', 'startup', 'ai', 'coding', 'webdev', 'mobile', 'ux', 'product', 'javascript', 'python', 'react', 'nodejs', 'database', 'cloud', 'security', 'testing', 'devops', 'career'],
  interests: ['Technology', 'Design', 'Business', 'Science', 'Art', 'Music', 'Sports', 'Travel', 'Food', 'Photography', 'Gaming', 'Reading', 'Movies', 'Fitness', 'Cooking']
};

// Enhanced user data generation
function generateUserData(index) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const username = faker.internet.userName({ firstName, lastName }).toLowerCase().replace(/[^a-z0-9_]/g, '');
  
  return {
    _id: randomUUID(),
    name: `${firstName} ${lastName}`,
    username: username,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    bio: faker.person.bio(),
    location: `${faker.location.city()}, ${faker.location.country()}`,
    website: faker.internet.url(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    interests: faker.helpers.arrayElements(config.interests, faker.number.int({ min: 2, max: 5 })),
    isVerified: faker.datatype.boolean(0.1), // 10% chance
    isActive: true,
    lastLogin: faker.date.recent({ days: 30 })
  };
}

// Enhanced post content generation
function generatePostContent() {
  const templates = [
    "Just {action} {topic}! {emoji} {hashtags}",
    "Working on {project} today. {hashtags} {emoji}",
    "{opinion} about {topic}. What do you think? {hashtags}",
    "{achievement} {emoji} {hashtags}",
    "Learning {skill} has been {experience}. {hashtags}",
    "{question} {hashtags} {emoji}",
    "Excited to share {news}! {hashtags} {emoji}"
  ];
  
  const actions = ['launched', 'built', 'created', 'designed', 'developed'];
  const topics = ['a new feature', 'an AI project', 'a mobile app', 'a web application', 'a design system'];
  const emojis = ['🚀', '💡', '🔥', '✨', '🎯', '💪', '🌟'];
  const projects = ['my side project', 'the new dashboard', 'our platform', 'the API'];
  const opinions = ['I believe', 'In my opinion', 'I think', 'My take is'];
  const achievements = ['Milestone reached!', 'Goal accomplished!', 'Project completed!', 'New achievement unlocked!'];
  const skills = ['React', 'Node.js', 'Python', 'design', 'product management'];
  const experiences = ['amazing', 'challenging', 'rewarding', 'eye-opening'];
  const questions = ['What are your thoughts on this?', 'How do you approach this?', 'Any tips for beginners?'];
  const news = ['this update', 'my latest work', 'our progress', 'these results'];
  
  const template = faker.helpers.arrayElement(templates);
  const hashtags = faker.helpers.arrayElements(config.hashtags, faker.number.int({ min: 1, max: 3 }))
    .map(tag => `#${tag}`).join(' ');
  
  return template
    .replace('{action}', faker.helpers.arrayElement(actions))
    .replace('{topic}', faker.helpers.arrayElement(topics))
    .replace('{emoji}', faker.helpers.arrayElement(emojis))
    .replace('{hashtags}', hashtags)
    .replace('{project}', faker.helpers.arrayElement(projects))
    .replace('{opinion}', faker.helpers.arrayElement(opinions))
    .replace('{achievement}', faker.helpers.arrayElement(achievements))
    .replace('{skill}', faker.helpers.arrayElement(skills))
    .replace('{experience}', faker.helpers.arrayElement(experiences))
    .replace('{question}', faker.helpers.arrayElement(questions))
    .replace('{news}', faker.helpers.arrayElement(news));
}

// Media generation
function generateMediaData() {
  const mediaTypes = ['image', 'video'];
  const type = faker.helpers.arrayElement(mediaTypes);
  
  return {
    type,
    url: type === 'image' 
      ? faker.image.url({ width: 800, height: 600 })
      : `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4`,
    thumbnail: type === 'video' ? faker.image.url({ width: 320, height: 240 }) : null,
    metadata: {
      width: type === 'image' ? 800 : 1280,
      height: type === 'image' ? 600 : 720,
      duration: type === 'video' ? 60 : null,
      size: faker.number.int({ min: 100000, max: 5000000 })
    }
  };
}

// Notification generation
function generateNotificationData(sender, recipient, type, relatedPost = null) {
  const messages = {
    follow: `${sender.name} started following you`,
    like: `${sender.name} liked your post`,
    comment: `${sender.name} commented on your post`,
    mention: `${sender.name} mentioned you in a post`,
    share: `${sender.name} shared your post`
  };
  
  return {
    _id: randomUUID(),
    recipient: recipient._id,
    sender: sender._id,
    type,
    relatedPost,
    message: messages[type],
    isRead: faker.datatype.boolean(0.3), // 30% chance of being read
    readAt: faker.date.recent({ days: 7 })
  };
}

// MongoDB Seeding Functions
async function seedMongoDB() {
  console.log('🍃 Seeding MongoDB...');
  
  if (config.reset) {
    console.log('🗑️  Resetting MongoDB collections...');
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Media.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('✅ MongoDB collections reset');
  }
  
  // Generate users
  console.log(`👥 Creating ${config.usersCount} users...`);
  const users = [];
  for (let i = 0; i < config.usersCount; i++) {
    const userData = generateUserData(i);
    userData.password = await bcrypt.hash('password123', 10);
    
    const user = new User(userData);
    await user.save();
    users.push(user);
  }
  console.log(`✅ Created ${users.length} users`);
  
  // Generate posts with media
  console.log(`📝 Creating ${config.postsCount} posts...`);
  const posts = [];
  for (let i = 0; i < config.postsCount; i++) {
    const author = faker.helpers.arrayElement(users);
    const mediaCount = faker.number.int({ min: 0, max: config.maxMediaPerPost });
    const media = [];
    
    // Create media files
    for (let j = 0; j < mediaCount; j++) {
      const mediaData = generateMediaData();
      const mediaFile = new Media({
        ...mediaData,
        filename: `media_${randomUUID()}.${mediaData.type === 'image' ? 'jpg' : 'mp4'}`,
        originalName: faker.system.fileName(),
        uploadedBy: author._id,
        isUsed: true
      });
      await mediaFile.save();
      media.push(mediaData);
    }
    
    const post = new Post({
      _id: randomUUID(),
      author: author._id,
      content: generatePostContent(),
      media,
      likes: [],
      dislikes: [],
      comments: [],
      tags: faker.helpers.arrayElements(config.hashtags, faker.number.int({ min: 0, max: 3 })),
      isPublic: faker.datatype.boolean(0.8), // 80% public posts
      viewCount: faker.number.int({ min: 10, max: 500 })
    });
    
    await post.save();
    posts.push(post);
  }
  console.log(`✅ Created ${posts.length} posts`);
  
  // Generate likes and comments
  console.log('❤️  Adding likes and comments...');
  for (const post of posts) {
    // Add likes
    const likeCount = faker.number.int({ min: 0, max: config.maxLikesPerPost });
    const likers = faker.helpers.arrayElements(users, likeCount);
    
    for (const liker of likers) {
      if (liker._id !== post.author) {
        post.likes.push({
          user: liker._id,
          createdAt: faker.date.recent({ days: 7 })
        });
      }
    }
    
    // Add comments
    const commentCount = faker.number.int({ min: 0, max: config.maxCommentsPerPost });
    for (let i = 0; i < commentCount; i++) {
      const commenter = faker.helpers.arrayElement(users);
      if (commenter._id !== post.author) {
        const comment = new Comment({
          _id: randomUUID(),
          post: post._id,
          author: commenter._id,
          content: faker.lorem.sentence(),
          likes: [],
          replies: []
        });
        await comment.save();
        post.comments.push(comment._id);
      }
    }
    
    await post.save();
  }
  console.log('✅ Added likes and comments');
  
  return { users, posts };
}

// Neo4j Seeding Functions
async function seedNeo4j(users, posts) {
  console.log('🕸️  Seeding Neo4j...');
  
  try {
    // Create users in Neo4j
    console.log('👥 Creating users in Neo4j...');
    for (const user of users) {
      await neo4jService.createUser(user._id, user.username, user.name);
    }
    console.log(`✅ Created ${users.length} users in Neo4j`);
    
    // Create relationships (follows)
    console.log('🔗 Creating relationships in Neo4j...');
    for (const user of users) {
      const followCount = faker.number.int({ min: 1, max: config.maxFollowersPerUser });
      const potentialFollowees = users.filter(u => u._id !== user._id);
      const followees = faker.helpers.arrayElements(potentialFollowees, followCount);
      
      for (const followee of followees) {
        await neo4jService.followUser(user._id, followee._id);
      }
    }
    console.log('✅ Created relationships in Neo4j');
    
    // Create post relationships
    console.log('📝 Creating post relationships in Neo4j...');
    for (const post of posts) {
      await neo4jService.createPost(post.author, post._id);
      
      // Add likes relationships
      for (const like of post.likes) {
        await neo4jService.likePost(like.user, post._id);
      }
    }
    console.log('✅ Created post relationships in Neo4j');
    
  } catch (error) {
    console.log('⚠️  Neo4j seeding failed, continuing with MongoDB only:', error.message);
  }
}

// Main seeding function
async function seedDatabase() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting comprehensive database seeding...');
    console.log(`📊 Configuration: ${config.usersCount} users, ${config.postsCount} posts`);
    
    // Connect to databases
    console.log('🔗 Connecting to databases...');
    await mongoService.connect();
    
    try {
      await neo4jService.connect();
      console.log('✅ Connected to Neo4j');
    } catch (error) {
      console.log('⚠️  Neo4j connection failed, continuing with MongoDB only');
    }
    
    // Seed MongoDB
    const { users, posts } = await seedMongoDB();
    
    // Seed Neo4j
    if (neo4jService.driver) {
      await seedNeo4j(users, posts);
    }
    
    // Generate notifications
    console.log('🔔 Creating notifications...');
    const notifications = [];
    for (let i = 0; i < config.usersCount * 5; i++) {
      const sender = faker.helpers.arrayElement(users);
      const recipient = faker.helpers.arrayElement(users);
      if (sender._id !== recipient._id) {
        const types = ['follow', 'like', 'comment'];
        const type = faker.helpers.arrayElement(types);
        const relatedPost = type !== 'follow' ? faker.helpers.arrayElement(posts) : null;
        
        const notification = new Notification(generateNotificationData(sender, recipient, type, relatedPost));
        await notification.save();
        notifications.push(notification);
      }
    }
    console.log(`✅ Created ${notifications.length} notifications`);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Created: ${config.usersCount} users, ${posts.length} posts, ${notifications.length} notifications`);
    
    // Display sample login credentials
    console.log('\n🔑 Sample login credentials:');
    console.log('Email: alice@example.com, Password: password123');
    console.log('Email: bob@example.com, Password: password123');
    console.log('Email: carol@example.com, Password: password123');
    console.log('\nOr use any generated user email with password: password123');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    try {
      await mongoose.connection.close();
      if (neo4jService.driver) {
        await neo4jService.close();
      }
    } catch (error) {
      console.error('Error closing connections:', error);
    }
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };