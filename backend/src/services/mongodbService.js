const mongoose = require('mongoose');

class MongoDBService {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(process.env.MONGODB_URI, options);
      
      console.log('Connected to MongoDB database');
      
      // Set up event listeners
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

      process.on('SIGINT', async () => {
        await this.close();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async close() {
    if (this.connection) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }

  async healthCheck() {
    try {
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', database: 'mongodb' };
    } catch (error) {
      return { status: 'unhealthy', database: 'mongodb', error: error.message };
    }
  }

  // Database statistics
  async getStats() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      const stats = {};
      
      for (const collection of collections) {
        const collectionStats = await db.collection(collection.name).stats();
        stats[collection.name] = {
          documentCount: collectionStats.count,
          avgObjSize: collectionStats.avgObjSize,
          storageSize: collectionStats.storageSize,
          indexCount: collectionStats.nindexes
        };
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting MongoDB stats:', error);
      throw error;
    }
  }
}

module.exports = new MongoDBService();