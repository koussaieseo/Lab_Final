require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const { User, Post, Comment } = require('../src/models');
const neo4jService = require('../src/services/neo4jService');
const mongoService = require('../src/services/mongodbService');

// Sample data
const sampleUsers = [
  {
    name: 'Alice Johnson',
    username: 'alice_j',
    email: 'alice@example.com',
    bio: 'Software engineer passionate about AI and machine learning',
    location: 'San Francisco, CA',
    website: 'https://alice-tech-blog.com'
  },
  {
    name: 'Bob Smith',
    username: 'bob_smith',
    email: 'bob@example.com',
    bio: 'Full-stack developer and open source enthusiast',
    location: 'New York, NY',
    website: 'https://github.com/bobsmith'
  },
  {
    name: 'Carol Davis',
    username: 'carol_d',
    email: 'carol@example.com',
    bio: 'UX/UI designer with a passion for creating beautiful interfaces',
    location: 'Los Angeles, CA'
  },
  {
    name: 'David Wilson',
    username: 'david_w',
    email: 'david@example.com',
    bio: 'Data scientist and machine learning researcher',
    location: 'Boston, MA',
    website: 'https://david-wilson-research.org'
  },
  {
    name: 'Emma Brown',
    username: 'emma_b',
    email: 'emma@example.com',
    bio: 'Product manager with expertise in SaaS platforms',
    location: 'Seattle, WA'
  },
  {
    name: 'Frank Miller',
    username: 'frank_m',
    email: 'frank@example.com',
    bio: 'DevOps engineer and cloud architecture specialist',
    location: 'Austin, TX',
    website: 'https://frank-devops.io'
  },
  {
    name: 'Grace Lee',
    username: 'grace_l',
    email: 'grace@example.com',
    bio: 'Mobile app developer focusing on iOS and Flutter',
    location: 'Chicago, IL'
  },
  {
    name: 'Henry Chen',
    username: 'henry_c',
    email: 'henry@example.com',
    bio: 'Cybersecurity expert and ethical hacker',
    location: 'Denver, CO',
    website: 'https://henry-security.com'
  }
];

const samplePosts = [
  "Just launched my new AI-powered project! Excited to see how it performs in production. 🚀",
  "Working on improving the user experience of our dashboard. What are your favorite UX patterns?",
  "The future of web development is here with WebAssembly. Here's why you should care...",
  "Machine learning is not just about algorithms, it's about understanding your data. Thoughts?",
  "Product management tip: Always start with the user problem, not the solution.",
  "DevOps best practices: Automate everything that can be automated. Your future self will thank you.",
  "Mobile development is evolving rapidly. Cross-platform vs native - what's your take?",
  "Security should be built into your application from day one, not added as an afterthought.",
  "Just attended an amazing tech conference! So many inspiring talks and great networking.",
  "The importance of code reviews cannot be overstated. They improve code quality and team knowledge.",
  "Design systems are game-changers for maintaining consistency across large applications.",
  "Data visualization is both an art and a science. Making complex data understandable is crucial.",
  "Remote work has changed how we collaborate. What tools and practices work best for your team?",
  "Performance optimization is essential for user experience. Every millisecond counts!",
  "Open source contributions have taught me so much about collaborative development."
];

const sampleComments = [
  "Great insights! This really helped me understand the topic better.",
  "I completely agree with your perspective on this.",
  "Interesting approach! Have you considered the performance implications?",
  "This is exactly what I was looking for. Thanks for sharing!",
  "Could you elaborate more on the implementation details?",
  "I've had similar experiences with this technology.",
  "The examples you provided are really helpful.",
  "Looking forward to seeing more content like this!"
];

async function createUsers() {
  console.log('Creating sample users...');
  const createdUsers = [];

  for (const userData of sampleUsers) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        createdUsers.push(existingUser);
        continue;
      }

      // Create user in MongoDB
      const userId = randomUUID();
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const user = new User({
        _id: userId,
        ...userData,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        isActive: true
      });

      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${userData.name} (${userData.email})`);

      // Create user in Neo4j (optional)
      try {
        await neo4jService.createUser(userId, userData.username, userData.name);
      } catch (error) {
        // Neo4j not available, continue
      }
      
    } catch (error) {
      console.error(`Error creating user ${userData.email}:`, error.message);
    }
  }

  return createdUsers;
}

async function createRelationships(users) {
  console.log('Creating sample relationships...');
  
  // Create a realistic social network pattern
  const relationshipPatterns = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], // Chain
    [0, 3], [1, 4], [2, 5], [3, 6], [4, 7], // Cross connections
    [0, 4], [1, 5], [2, 6], [3, 7] // More cross connections
  ];

  for (const [fromIndex, toIndex] of relationshipPatterns) {
    try {
      if (fromIndex < users.length && toIndex < users.length) {
        const fromUser = users[fromIndex];
        const toUser = users[toIndex];
        
        // Try to create Neo4j relationship (optional)
        try {
          await neo4jService.followUser(fromUser._id, toUser._id);
        } catch (error) {
          // Neo4j not available, continue with MongoDB only
        }
        
        console.log(`Created relationship: ${fromUser.username} follows ${toUser.username}`);
      }
    } catch (error) {
      console.error(`Error creating relationship:`, error.message);
    }
  }
}

async function createPosts(users) {
  console.log('Creating sample posts...');
  
  for (let i = 0; i < samplePosts.length; i++) {
    try {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const postId = randomUUID();
      
      const post = new Post({
        _id: postId,
        author: randomUser._id,
        content: samplePosts[i],
        media: [],
        likes: [],
        dislikes: [],
        comments: [],
        tags: [],
        isPublic: true
      });

      await post.save();
      console.log(`Created post by ${randomUser.username}: "${samplePosts[i].substring(0, 50)}..."`);
      
      // Create some comments for this post
      const numComments = Math.floor(Math.random() * 5);
      for (let j = 0; j < numComments; j++) {
        const commentUser = users[Math.floor(Math.random() * users.length)];
        if (commentUser._id !== randomUser._id) {
          const comment = new Comment({
            _id: randomUUID(),
            post: postId,
            author: commentUser._id,
            content: sampleComments[Math.floor(Math.random() * sampleComments.length)],
            likes: [],
            replies: []
          });
          await comment.save();
          post.comments.push(comment._id);
        }
      }
      await post.save();
      
    } catch (error) {
      console.error(`Error creating post:`, error.message);
    }
  }
}

async function generateSampleData() {
  try {
    console.log('🚀 Starting sample data generation...');
    
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoService.connect();
    
    // Connect to Neo4j (optional for demo)
    console.log('🕸️  Connecting to Neo4j...');
    try {
      await neo4jService.connect();
      console.log('✅ Connected to Neo4j');
    } catch (error) {
      console.log('⚠️  Neo4j connection failed, continuing with MongoDB only');
    }
    
    // Create users
    const users = await createUsers();
    console.log(`✅ Created ${users.length} users`);
    
    // Create relationships
    await createRelationships(users);
    console.log('✅ Created sample relationships');
    
    // Create posts
    await createPosts(users);
    console.log('✅ Created sample posts and comments');
    
    console.log('\n🎉 Sample data generation completed successfully!');
    console.log('\nTest accounts created:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - password: password123`);
    });
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
  } finally {
    // Close connections
    try {
      await mongoose.connection.close();
      await neo4jService.close();
    } catch (error) {
      console.error('Error closing connections:', error);
    }
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  generateSampleData();
}

module.exports = { generateSampleData };