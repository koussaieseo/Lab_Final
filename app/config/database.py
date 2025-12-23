"""
Database connection utilities
"""
from pymongo import MongoClient
from neo4j import GraphDatabase
from .config import MONGO_URI, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, MONGO_DB_NAME

# MongoDB Connection with connection pooling and error handling
try:
    mongo_client = MongoClient(MONGO_URI, maxPoolSize=10, minPoolSize=2, serverSelectionTimeoutMS=5000)
    # Test connection
    mongo_client.admin.command('ping')
    mongo_db = mongo_client[MONGO_DB_NAME]
    movies_collection = mongo_db["movies"]
    print("✅ MongoDB connected successfully")
except Exception as e:
    print(f"⚠️  MongoDB connection failed: {e}")
    print("⚠️  Using mock data for development")
    mongo_client = None
    mongo_db = None
    movies_collection = None

# Neo4j Connection with connection pooling and error handling
try:
    neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD), max_connection_pool_size=10)
    # Test connection
    with neo4j_driver.session() as session:
        session.run("RETURN 1").single()
    print("✅ Neo4j connected successfully")
except Exception as e:
    print(f"⚠️  Neo4j connection failed: {e}")
    print("⚠️  Using mock data for development")
    neo4j_driver = None

def get_neo4j_session():
    """Get a Neo4j database session with proper cleanup"""
    if neo4j_driver is None:
        raise Exception("Neo4j database is not available")
    session = neo4j_driver.session()
    try:
        yield session
    finally:
        session.close()

def close_connections():
    """Close all database connections safely"""
    try:
        if mongo_client:
            mongo_client.close()
    except Exception as e:
        print(f"Error closing MongoDB connection: {e}")
    
    try:
        if neo4j_driver:
            neo4j_driver.close()
    except Exception as e:
        print(f"Error closing Neo4j connection: {e}")