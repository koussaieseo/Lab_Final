#!/usr/bin/env node

/**
 * Database Initialization Script
 * Checks if databases are empty and seeds them automatically
 * Usage: node scripts/initDatabase.js [--force]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models');
const neo4jService = require('../src/services/neo4jService');
const mongoService = require('../src/services/mongodbService');
const { seedDatabase } = require('./seedDatabase');
const { seedNeo4jGraph } = require('./seedNeo4jGraph');

// Configuration
const config = {
  force: process.argv.includes('--force'),
  checkMongoDB: true,
  checkNeo4j: true,
  seedIfEmpty: true
};

async function checkMongoDBEmpty() {
  try {
    await mongoService.connect();
    const userCount = await User.countDocuments();
    console.log(`📊 MongoDB user count: ${userCount}`);
    return userCount === 0;
  } catch (error) {
    console.error('❌ MongoDB check failed:', error.message);
    return false;
  }
}

async function checkNeo4jEmpty() {
  try {
    await neo4jService.connect();
    const session = neo4jService.driver.session();
    
    try {
      const result = await session.run('MATCH (u:User) RETURN count(u) as count');
      const userCount = result.records[0].get('count').toNumber();
      console.log(`🕸️  Neo4j user count: ${userCount}`);
      return userCount === 0;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('❌ Neo4j check failed:', error.message);
    return false;
  }
}

async function initializeMongoDB() {
  console.log('🍃 Initializing MongoDB...');
  
  const isEmpty = await checkMongoDBEmpty();
  
  if (config.force || (config.seedIfEmpty && isEmpty)) {
    console.log(isEmpty ? '🌱 MongoDB is empty, seeding data...' : '🔥 Force seeding MongoDB...');
    
    try {
      await seedDatabase();
      console.log('✅ MongoDB initialization completed');
    } catch (error) {
      console.error('❌ MongoDB seeding failed:', error);
      throw error;
    }
  } else if (!isEmpty) {
    console.log('✅ MongoDB already contains data, skipping seed');
  }
}

async function initializeNeo4j() {
  console.log('🕸️  Initializing Neo4j...');
  
  const isEmpty = await checkNeo4jEmpty();
  
  if (config.force || (config.seedIfEmpty && isEmpty)) {
    console.log(isEmpty ? '🌱 Neo4j is empty, seeding data...' : '🔥 Force seeding Neo4j...');
    
    try {
      await seedNeo4jGraph();
      console.log('✅ Neo4j initialization completed');
    } catch (error) {
      console.error('❌ Neo4j seeding failed:', error);
      throw error;
    }
  } else if (!isEmpty) {
    console.log('✅ Neo4j already contains data, skipping seed');
  }
}

async function checkDatabaseConnections() {
  console.log('🔍 Checking database connections...');
  
  const results = {
    mongodb: false,
    neo4j: false
  };
  
  try {
    await mongoService.connect();
    results.mongodb = true;
    console.log('✅ MongoDB connection successful');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
  
  try {
    await neo4jService.connect();
    results.neo4j = true;
    console.log('✅ Neo4j connection successful');
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error.message);
  }
  
  return results;
}

async function initializeDatabases() {
  console.log('🚀 Starting database initialization...');
  console.log(`⚙️  Configuration: force=${config.force}, seedIfEmpty=${config.seedIfEmpty}`);
  
  try {
    // Check connections first
    const connections = await checkDatabaseConnections();
    
    if (!connections.mongodb && !connections.neo4j) {
      console.error('❌ No database connections available');
      process.exit(1);
    }
    
    // Initialize MongoDB if available
    if (connections.mongodb) {
      await initializeMongoDB();
    }
    
    // Initialize Neo4j if available
    if (connections.neo4j) {
      await initializeNeo4j();
    }
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  MongoDB: ${connections.mongodb ? '✅ Connected' : '❌ Failed'}`);
    console.log(`  Neo4j: ${connections.neo4j ? '✅ Connected' : '❌ Failed'}`);
    
    if (connections.mongodb) {
      console.log('\n🔑 Sample login credentials:');
      console.log('  Email: alice@example.com, Password: password123');
      console.log('  Email: bob@example.com, Password: password123');
      console.log('  Or any generated user email with password: password123');
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
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

// Command line interface
function showHelp() {
  console.log(`
Database Initialization Script

Usage: node scripts/initDatabase.js [options]

Options:
  --force       Force seeding even if databases contain data
  --help        Show this help message

Examples:
  node scripts/initDatabase.js          # Check and seed if empty
  node scripts/initDatabase.js --force  # Force seed all databases
  node scripts/initDatabase.js --help   # Show help
`);
}

if (process.argv.includes('--help')) {
  showHelp();
  process.exit(0);
}

// Run the script
if (require.main === module) {
  initializeDatabases();
}

// Server-friendly initialization (doesn't exit process)
async function initializeDatabasesForServer() {
  console.log('🚀 Starting database initialization for server...');
  
  try {
    // Check connections first
    const connections = await checkDatabaseConnections();
    
    if (!connections.mongodb && !connections.neo4j) {
      throw new Error('No database connections available');
    }
    
    // Initialize MongoDB if available
    if (connections.mongodb) {
      await initializeMongoDB();
    }
    
    // Initialize Neo4j if available
    if (connections.neo4j) {
      await initializeNeo4j();
    }
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  MongoDB: ${connections.mongodb ? '✅ Connected' : '❌ Failed'}`);
    console.log(`  Neo4j: ${connections.neo4j ? '✅ Connected' : '❌ Failed'}`);
    
    if (connections.mongodb) {
      console.log('\n🔑 Sample login credentials:');
      console.log('  Email: alice@example.com, Password: password123');
      console.log('  Email: bob@example.com, Password: password123');
      console.log('  Or any generated user email with password: password123');
    }
    
    return connections;
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error; // Re-throw for server to handle
  }
}

module.exports = { initializeDatabases, initializeDatabasesForServer };