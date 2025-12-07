#!/usr/bin/env node

/**
 * Neo4j Graph Database Seeding Script
 * Creates complex social network relationships and graph patterns
 * Usage: node scripts/seedNeo4jGraph.js [--reset] [--users N]
 */

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const neo4jService = require('../src/services/neo4jService');

// Configuration
const config = {
  reset: process.argv.includes('--reset'),
  usersCount: parseInt(process.argv.find(arg => arg.startsWith('--users='))?.split('=')[1]) || 50,
  maxFollowersPerUser: 25,
  maxPostsPerUser: 15,
  maxLikesPerUser: 100,
  maxCommentsPerUser: 50,
  communities: ['Tech', 'Design', 'Business', 'Science', 'Art', 'Music', 'Sports', 'Travel'],
  interests: ['Technology', 'Design', 'Business', 'Science', 'Art', 'Music', 'Sports', 'Travel', 'Food', 'Photography', 'Gaming', 'Reading', 'Movies', 'Fitness', 'Cooking'],
  relationshipTypes: ['COLLEAGUE', 'FRIEND', 'MENTOR', 'MENTEE', 'FAMILY', 'PARTNER']
};

// Generate realistic social network data
function generateSocialNetworkData() {
  const users = [];
  const posts = [];
  const relationships = [];
  
  // Generate users with communities and interests
  for (let i = 0; i < config.usersCount; i++) {
    const userId = `user_${i + 1}`;
    const username = faker.internet.userName().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const name = faker.person.fullName();
    const email = faker.internet.email();
    const bio = faker.person.bio();
    const location = `${faker.location.city()}, ${faker.location.country()}`;
    const interests = faker.helpers.arrayElements(config.interests, faker.number.int({ min: 2, max: 5 }));
    const communities = faker.helpers.arrayElements(config.communities, faker.number.int({ min: 1, max: 3 }));
    
    users.push({
      id: userId,
      username,
      name,
      email,
      bio,
      location,
      interests,
      communities,
      createdAt: faker.date.past({ years: 2 }).toISOString(),
      isActive: faker.datatype.boolean(0.9),
      isVerified: faker.datatype.boolean(0.1)
    });
  }
  
  // Generate posts
  for (let i = 0; i < config.usersCount * 3; i++) {
    const author = faker.helpers.arrayElement(users);
    const postId = `post_${i + 1}`;
    const content = faker.lorem.paragraph();
    const tags = faker.helpers.arrayElements(config.interests, faker.number.int({ min: 0, max: 3 }));
    const createdAt = faker.date.past({ years: 1 });
    
    posts.push({
      id: postId,
      author: author.id,
      content,
      tags,
      createdAt,
      isPublic: faker.datatype.boolean(0.8),
      viewCount: faker.number.int({ min: 10, max: 1000 })
    });
  }
  
  // Generate realistic social network relationships
  // 1. Community-based connections (people in same communities follow each other)
  for (const community of config.communities) {
    const communityUsers = users.filter(user => user.communities.includes(community));
    for (let i = 0; i < communityUsers.length; i++) {
      for (let j = i + 1; j < communityUsers.length; j++) {
        if (faker.datatype.boolean(0.3)) { // 30% chance of connection
          relationships.push({
            from: communityUsers[i].id,
            to: communityUsers[j].id,
            type: 'FOLLOWS',
            weight: faker.number.int({ min: 1, max: 10 }),
            createdAt: faker.date.past({ years: 1 }).toISOString()
          });
        }
      }
    }
  }
  
  // 2. Interest-based connections
  for (const interest of config.interests) {
    const interestedUsers = users.filter(user => user.interests.includes(interest));
    for (let i = 0; i < interestedUsers.length; i++) {
      for (let j = i + 1; j < interestedUsers.length; j++) {
        if (faker.datatype.boolean(0.2)) { // 20% chance of connection
          relationships.push({
            from: interestedUsers[i].id,
            to: interestedUsers[j].id,
            type: 'FOLLOWS',
            weight: faker.number.int({ min: 1, max: 10 }),
            createdAt: faker.date.past({ years: 1 })
          });
        }
      }
    }
  }
  
  // 3. Random connections to create network effects
  for (let i = 0; i < config.usersCount * 2; i++) {
    const fromUser = faker.helpers.arrayElement(users);
    const toUser = faker.helpers.arrayElement(users.filter(u => u.id !== fromUser.id));
    
    // Check if relationship already exists
    const existing = relationships.find(r => r.from === fromUser.id && r.to === toUser.id);
    if (!existing && faker.datatype.boolean(0.5)) {
      relationships.push({
        from: fromUser.id,
        to: toUser.id,
        type: 'FOLLOWS',
        weight: faker.number.int({ min: 1, max: 10 }),
        createdAt: faker.date.past({ years: 1 })
      });
    }
  }
  
  // 4. Generate special relationship types (mentor, colleague, etc.)
  for (let i = 0; i < config.usersCount / 5; i++) {
    const user1 = faker.helpers.arrayElement(users);
    const user2 = faker.helpers.arrayElement(users.filter(u => u.id !== user1.id));
    const relationshipType = faker.helpers.arrayElement(config.relationshipTypes);
    
    relationships.push({
      from: user1.id,
      to: user2.id,
      type: relationshipType,
      weight: faker.number.int({ min: 5, max: 15 }),
      createdAt: faker.date.past({ years: 2 })
    });
  }
  
  return { users, posts, relationships };
}

// Neo4j seeding functions
async function createUsersInNeo4j(users) {
  console.log('👥 Creating users in Neo4j...');
  const session = neo4jService.driver.session();
  
  try {
    for (const user of users) {
      // Ensure we're only passing primitive types and arrays
      const userData = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        bio: user.bio,
        location: user.location,
        interests: user.interests || [],
        communities: user.communities || [],
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
        isActive: user.isActive,
        isVerified: user.isVerified,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0
      };
      
      await session.run(`
        CREATE (u:User {
          id: $id,
          username: $username,
          name: $name,
          email: $email,
          bio: $bio,
          location: $location,
          interests: $interests,
          communities: $communities,
          createdAt: $createdAt,
          isActive: $isActive,
          isVerified: $isVerified,
          followersCount: $followersCount,
          followingCount: $followingCount,
          postsCount: $postsCount
        })
      `, userData);
    }
    console.log(`✅ Created ${users.length} users in Neo4j`);
  } finally {
    await session.close();
  }
}

async function createCommunitiesInNeo4j() {
  console.log('🏘️  Creating communities in Neo4j...');
  const session = neo4jService.driver.session();
  
  try {
    for (const community of config.communities) {
      await session.run(`
        CREATE (c:Community {
          name: $name,
          description: $description,
          memberCount: 0,
          createdAt: $createdAt
        })
      `, {
        name: community,
        description: `Community for ${community} enthusiasts`,
        createdAt: faker.date.past({ years: 1 })
      });
    }
    console.log(`✅ Created ${config.communities.length} communities in Neo4j`);
  } finally {
    await session.close();
  }
}

async function createInterestsInNeo4j() {
  console.log('💡 Creating interests in Neo4j...');
  const session = neo4jService.driver.session();
  
  try {
    for (const interest of config.interests) {
      await session.run(`
        CREATE (i:Interest {
          name: $name,
          description: $description,
          popularity: $popularity
        })
      `, {
        name: interest,
        description: `Interest in ${interest}`,
        popularity: faker.number.int({ min: 1, max: 100 })
      });
    }
    console.log(`✅ Created ${config.interests.length} interests in Neo4j`);
  } finally {
    await session.close();
  }
}

async function createRelationshipsInNeo4j(relationships) {
  console.log('🔗 Creating relationships in Neo4j...');
  const session = neo4jService.driver.session();
  
  try {
    let batchSize = 1000;
    for (let i = 0; i < relationships.length; i += batchSize) {
      const batch = relationships.slice(i, i + batchSize);
      
      for (const rel of batch) {
        await session.run(`
          MATCH (from:User {id: $fromId})
          MATCH (to:User {id: $toId})
          CREATE (from)-[r:${rel.type} {
            weight: $weight,
            createdAt: $createdAt
          }]->(to)
        `, {
          fromId: rel.from,
          toId: rel.to,
          weight: rel.weight,
          createdAt: rel.createdAt
        });
      }
      
      console.log(`  Processed ${Math.min(i + batchSize, relationships.length)}/${relationships.length} relationships`);
    }
    console.log(`✅ Created ${relationships.length} relationships in Neo4j`);
  } finally {
    await session.close();
  }
}

async function createUserCommunityRelationships(users) {
  console.log('🏘️  Creating user-community relationships...');
  const session = neo4jService.driver.session();
  
  try {
    for (const user of users) {
      for (const community of user.communities) {
        await session.run(`
          MATCH (u:User {id: $userId})
          MATCH (c:Community {name: $communityName})
          CREATE (u)-[:MEMBER_OF {
            joinedAt: $joinedAt,
            isActive: $isActive
          }]->(c)
        `, {
          userId: user.id,
          communityName: community,
          joinedAt: faker.date.past({ years: 1 }),
          isActive: faker.datatype.boolean(0.9)
        });
      }
    }
    console.log('✅ Created user-community relationships');
  } finally {
    await session.close();
  }
}

async function createUserInterestRelationships(users) {
  console.log('💡 Creating user-interest relationships...');
  const session = neo4jService.driver.session();
  
  try {
    for (const user of users) {
      for (const interest of user.interests) {
        await session.run(`
          MATCH (u:User {id: $userId})
          MATCH (i:Interest {name: $interestName})
          CREATE (u)-[:INTERESTED_IN {
            level: $level,
            createdAt: $createdAt
          }]->(i)
        `, {
          userId: user.id,
          interestName: interest,
          level: faker.number.int({ min: 1, max: 10 }),
          createdAt: faker.date.past({ years: 1 })
        });
      }
    }
    console.log('✅ Created user-interest relationships');
  } finally {
    await session.close();
  }
}

async function updateUserStatistics() {
  console.log('📊 Updating user statistics...');
  const session = neo4jService.driver.session();
  
  try {
    // Update followers count
    await session.run(`
      MATCH (u:User)
      OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
      SET u.followersCount = COUNT(follower)
    `);
    
    // Update following count
    await session.run(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
      SET u.followingCount = COUNT(following)
    `);
    
    // Update posts count
    await session.run(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[:CREATED]->(post:Post)
      SET u.postsCount = COUNT(post)
    `);
    
    console.log('✅ Updated user statistics');
  } finally {
    await session.close();
  }
}

async function createGraphIndexes() {
  console.log('🔍 Creating graph indexes...');
  const session = neo4jService.driver.session();
  
  try {
    // Create indexes for better performance
    await session.run(`
      CREATE INDEX user_id_index IF NOT EXISTS FOR (u:User) ON (u.id)
    `);
    
    await session.run(`
      CREATE INDEX user_username_index IF NOT EXISTS FOR (u:User) ON (u.username)
    `);
    
    await session.run(`
      CREATE INDEX community_name_index IF NOT EXISTS FOR (c:Community) ON (c.name)
    `);
    
    await session.run(`
      CREATE INDEX interest_name_index IF NOT EXISTS FOR (i:Interest) ON (i.name)
    `);
    
    console.log('✅ Created graph indexes');
  } finally {
    await session.close();
  }
}

// Main seeding function
async function seedNeo4jGraph() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting Neo4j graph seeding...');
    console.log(`📊 Configuration: ${config.usersCount} users, advanced relationships`);
    
    // Connect to Neo4j
    console.log('🔗 Connecting to Neo4j...');
    await neo4jService.connect();
    
    // Reset database if requested
    if (config.reset) {
      console.log('🗑️  Resetting Neo4j database...');
      const session = neo4jService.driver.session();
      try {
        await session.run('MATCH (n) DETACH DELETE n');
        console.log('✅ Neo4j database reset');
      } finally {
        await session.close();
      }
    }
    
    // Generate social network data
    console.log('🧠 Generating social network data...');
    const { users, posts, relationships } = generateSocialNetworkData();
    
    // Create indexes first
    await createGraphIndexes();
    
    // Create nodes
    await createUsersInNeo4j(users);
    await createCommunitiesInNeo4j();
    await createInterestsInNeo4j();
    
    // Create relationships
    await createRelationshipsInNeo4j(relationships);
    await createUserCommunityRelationships(users);
    await createUserInterestRelationships(users);
    
    // Update statistics
    await updateUserStatistics();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 Neo4j graph seeding completed successfully!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Created: ${users.length} users, ${relationships.length} relationships`);
    console.log(`🏘️  Communities: ${config.communities.length}`);
    console.log(`💡 Interests: ${config.interests.length}`);
    
    // Display sample queries for testing
    console.log('\n🔍 Sample Cypher queries for testing:');
    console.log('// Find most followed users');
    console.log('MATCH (u:User) RETURN u.name, u.followersCount ORDER BY u.followersCount DESC LIMIT 5');
    console.log('\n// Find users with similar interests');
    console.log('MATCH (u1:User)-[:INTERESTED_IN]->(i:Interest)<-[:INTERESTED_IN]-(u2:User) WHERE u1 <> u2 RETURN u1.name, u2.name, i.name LIMIT 10');
    console.log('\n// Find community members');
    console.log('MATCH (u:User)-[:MEMBER_OF]->(c:Community {name: "Tech"}) RETURN u.name, u.username');
    
  } catch (error) {
    console.error('❌ Neo4j graph seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    try {
      await neo4jService.close();
    } catch (error) {
      console.error('Error closing Neo4j connection:', error);
    }
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  seedNeo4jGraph();
}

module.exports = { seedNeo4jGraph };