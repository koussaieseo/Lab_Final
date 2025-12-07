# Database Seeding Scripts

This directory contains comprehensive database seeding scripts for the Social Network application, supporting both MongoDB and Neo4j databases.

## 🚀 Quick Start

### Automatic Initialization (Recommended)
```bash
# Initialize databases automatically (checks if empty, seeds if needed)
npm run init

# Force reinitialize all databases (overwrites existing data)
npm run init:force
```

### Manual Seeding
```bash
# Seed both MongoDB and Neo4j with default data
npm run seed:full

# Seed with custom parameters
npm run seed:demo        # Small dataset (10 users, 20 posts)
npm run seed:large       # Large dataset (100 users, 200 posts)

# Seed only Neo4j graph database
npm run seed:neo4j
npm run seed:neo4j-reset # Reset Neo4j first

# Reset and seed MongoDB
npm run seed:reset
```

## 📊 Seed Data Features

### MongoDB Seed Data (`seedDatabase.js`)
- **Users**: Realistic user profiles with avatars, bios, locations
- **Posts**: Generated content with hashtags, media attachments
- **Comments**: User-generated comments on posts
- **Media**: Image and video attachments with metadata
- **Notifications**: Like, comment, follow notifications
- **Likes/Dislikes**: Realistic engagement patterns

### Neo4j Graph Seed Data (`seedNeo4jGraph.js`)
- **Social Network**: Complex follower relationships
- **Communities**: User membership in interest-based communities
- **Interests**: User interest tags and connections
- **Relationship Types**: Follows, colleagues, mentors, friends
- **Graph Analytics**: Network centrality and influence metrics

## 🛠️ Advanced Usage

### Custom Parameters
```bash
# Seed with specific user and post counts
node scripts/seedDatabase.js --users=50 --posts=100

# Reset databases before seeding
node scripts/seedDatabase.js --reset --users=30 --posts=75

# Seed only Neo4j with custom user count
node scripts/seedNeo4jGraph.js --users=200
```

### Programmatic Usage
```javascript
const { seedDatabase } = require('./scripts/seedDatabase');
const { seedNeo4jGraph } = require('./scripts/seedNeo4jGraph');

// Seed MongoDB
await seedDatabase();

// Seed Neo4j
await seedNeo4jGraph();
```

## 📋 Sample Data Credentials

After seeding, you can log in with these test accounts:
- **Email**: alice@example.com, **Password**: password123
- **Email**: bob@example.com, **Password**: password123
- **Email**: carol@example.com, **Password**: password123

Or use any generated user email with password: `password123`

## 🔍 Database Verification

### Check MongoDB
```javascript
// Count users
const userCount = await User.countDocuments();

// Count posts
const postCount = await Post.countDocuments();

// Sample user
const sampleUser = await User.findOne({ email: 'alice@example.com' });
```

### Check Neo4j (Cypher Queries)
```cypher
// Count users
MATCH (u:User) RETURN count(u) as userCount

// Count relationships
MATCH ()-[r:FOLLOWS]->() RETURN count(r) as relationshipCount

// Find most followed users
MATCH (u:User)<-[:FOLLOWS]-(follower)
RETURN u.name, u.username, count(follower) as followers
ORDER BY followers DESC LIMIT 5

// Find user communities
MATCH (u:User {username: 'alice_j'})-[:MEMBER_OF]->(c:Community)
RETURN c.name as community
```

## 🚨 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB connection
node -e "require('./src/services/mongodbService').connect().then(() => console.log('MongoDB connected')).catch(err => console.error(err))"
```

### Neo4j Connection Issues
```bash
# Check Neo4j connection
node -e "require('./src/services/neo4jService').connect().then(() => console.log('Neo4j connected')).catch(err => console.error(err))"
```

### Reset Everything
```bash
# Reset both databases and reseed
npm run init:force
```

## 📈 Performance Tips

- **Small datasets** (`--users=10`): Fast, good for development
- **Medium datasets** (`--users=50`): Good for testing features
- **Large datasets** (`--users=200`): Realistic load testing
- **Very large datasets** (`--users=1000`): Performance testing only

The scripts automatically batch operations for optimal performance with large datasets.