const neo4j = require('neo4j-driver');

class Neo4jService {
  constructor() {
    this.driver = null;
  }

  async connect() {
    try {
      this.driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
      );
      
      await this.driver.verifyConnectivity();
      console.log('Connected to Neo4j database');
      
      // Initialize database schema
      await this.initializeSchema();
      
      return this.driver;
    } catch (error) {
      console.error('Neo4j connection error:', error);
      throw error;
    }
  }

  async initializeSchema() {
    const session = this.driver.session();
    try {
      // Create constraints and indexes
      await session.run(`
        CREATE CONSTRAINT user_id_unique IF NOT EXISTS
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE INDEX user_name_index IF NOT EXISTS
        FOR (u:User) ON (u.name)
      `);
      
      await session.run(`
        CREATE INDEX user_email_index IF NOT EXISTS
        FOR (u:User) ON (u.email)
      `);
      
      console.log('Neo4j schema initialized');
    } catch (error) {
      console.error('Schema initialization error:', error);
    } finally {
      await session.close();
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
      console.log('Neo4j connection closed');
    }
  }

  getSession() {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this.driver.session();
  }

  // User operations
  async createUser(userData) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        CREATE (u:User {
          id: $id,
          name: $name,
          email: $email,
          username: $username,
          avatar: $avatar,
          bio: $bio,
          createdAt: datetime()
        })
        RETURN u
      `, userData);
      
      return result.records[0]?.get('u').properties;
    } finally {
      await session.close();
    }
  }

  async updateUser(userId, updateData) {
    const session = this.getSession();
    try {
      const setClause = Object.keys(updateData)
        .filter(key => updateData[key] !== undefined)
        .map(key => `u.${key} = $${key}`)
        .join(', ');

      const result = await session.run(`
        MATCH (u:User {id: $userId})
        SET ${setClause}
        RETURN u
      `, { userId, ...updateData });
      
      return result.records[0]?.get('u').properties;
    } finally {
      await session.close();
    }
  }

  async getUserById(userId) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (u:User {id: $userId})
        RETURN u
      `, { userId });
      
      return result.records[0]?.get('u').properties;
    } finally {
      await session.close();
    }
  }

  // Relationship operations
  async followUser(followerId, followeeId) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (follower:User {id: $followerId})
        MATCH (followee:User {id: $followeeId})
        MERGE (follower)-[r:FOLLOWS]->(followee)
        ON CREATE SET r.createdAt = datetime()
        RETURN r
      `, { followerId, followeeId });
      
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  async unfollowUser(followerId, followeeId) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (follower:User {id: $followerId})
        MATCH (followee:User {id: $followeeId})
        MATCH (follower)-[r:FOLLOWS]->(followee)
        DELETE r
        RETURN count(r) as deleted
      `, { followerId, followeeId });
      
      return result.records[0]?.get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  async isFollowing(followerId, followeeId) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (follower:User {id: $followerId})
        MATCH (followee:User {id: $followeeId})
        RETURN EXISTS((follower)-[:FOLLOWS]->(followee)) as isFollowing
      `, { followerId, followeeId });
      
      return result.records[0]?.get('isFollowing');
    } finally {
      await session.close();
    }
  }

  async getFollowers(userId) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (follower:User)-[:FOLLOWS]->(u:User {id: $userId})
        RETURN follower
        ORDER BY follower.name
      `, { userId });
      
      return result.records.map(record => record.get('follower').properties);
    } finally {
      await session.close();
    }
  }

  async getFollowing(userId) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (u:User {id: $userId})-[:FOLLOWS]->(followee:User)
        RETURN followee
        ORDER BY followee.name
      `, { userId });
      
      return result.records.map(record => record.get('followee').properties);
    } finally {
      await session.close();
    }
  }

  // Recommendation engine using graph algorithms
  async getPeopleYouMayKnow(userId, limit = 10) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (user:User {id: $userId})
        MATCH (user)-[:FOLLOWS*1..3]-(potentialFriend:User)
        WHERE NOT (user)-[:FOLLOWS]->(potentialFriend)
        AND user <> potentialFriend
        WITH potentialFriend, COUNT(*) as mutualConnections
        ORDER BY mutualConnections DESC
        LIMIT $limit
        RETURN potentialFriend, mutualConnections
      `, { userId, limit: neo4j.int(limit) });
      
      return result.records.map(record => ({
        user: record.get('potentialFriend').properties,
        mutualConnections: record.get('mutualConnections').toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  // Shortest path between users
  async getShortestPath(userId1, userId2) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (user1:User {id: $userId1}), (user2:User {id: $userId2})
        MATCH path = shortestPath((user1)-[:FOLLOWS*]-(user2))
        RETURN path
      `, { userId1, userId2 });
      
      if (result.records.length === 0) {
        return null;
      }
      
      const path = result.records[0].get('path');
      return {
        length: path.length,
        nodes: path.nodes.map(node => node.properties),
        relationships: path.relationships.map(rel => rel.properties)
      };
    } finally {
      await session.close();
    }
  }

  // Get user network statistics
  async getNetworkStats(userId) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (user:User {id: $userId})
        OPTIONAL MATCH (user)-[:FOLLOWS]->(following:User)
        OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(user)
        OPTIONAL MATCH (user)-[:FOLLOWS*2]-(secondDegree:User)
        WHERE NOT (user)-[:FOLLOWS]->(secondDegree) AND user <> secondDegree
        RETURN 
          COUNT(DISTINCT following) as followingCount,
          COUNT(DISTINCT follower) as followersCount,
          COUNT(DISTINCT secondDegree) as secondDegreeConnections
      `, { userId });
      
      const record = result.records[0];
      return {
        following: record.get('followingCount').toNumber(),
        followers: record.get('followersCount').toNumber(),
        secondDegreeConnections: record.get('secondDegreeConnections').toNumber()
      };
    } finally {
      await session.close();
    }
  }

  // Get trending users based on follower count
  async getTrendingUsers(limit = 10) {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (u:User)
        OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
        WITH u, COUNT(follower) as followerCount
        ORDER BY followerCount DESC
        LIMIT $limit
        RETURN u.id as userId, followerCount
      `, { limit: neo4j.int(parseInt(limit)) });
      
      if (!result.records || result.records.length === 0) {
        return [];
      }
      
      return result.records.map(record => ({
        userId: record.get('userId'),
        followerCount: record.get('followerCount').toNumber()
      }));
    } catch (error) {
      console.error('Error in getTrendingUsers:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  // Health check
  async healthCheck() {
    try {
      const session = this.getSession();
      await session.run('RETURN 1');
      await session.close();
      return { status: 'healthy', database: 'neo4j' };
    } catch (error) {
      return { status: 'unhealthy', database: 'neo4j', error: error.message };
    }
  }
}

module.exports = new Neo4jService();