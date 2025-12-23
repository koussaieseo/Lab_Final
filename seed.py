import json
import os
import time
from pymongo import MongoClient
from neo4j import GraphDatabase
from bson import json_util

# Configuration - Load from environment variables or use defaults
import os
from dotenv import load_dotenv

from app.config.config import MONGO_DB_NAME

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/sample_mflix")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

MOVIES_FILE = "sample_mflix.movies.json"
COMMENTS_FILE = "sample_mflix.comments.json"

def wait_for_mongo():
    client = MongoClient(MONGO_URI)
    retries = 30
    while retries > 0:
        try:
            client.admin.command('ping')
            print("MongoDB is ready.")
            return client
        except Exception as e:
            print(f"Waiting for MongoDB... {e}")
            time.sleep(2)
            retries -= 1
    raise Exception("MongoDB failed to start")

def wait_for_neo4j():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    retries = 30
    while retries > 0:
        try:
            driver.verify_connectivity()
            print("Neo4j is ready.")
            return driver
        except Exception as e:
            print(f"Waiting for Neo4j... {e}")
            time.sleep(2)
            retries -= 1
    raise Exception("Neo4j failed to start")

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        # The file might be a single JSON object, a list of objects, or line-delimited JSON
        # Based on previous `read` output, it starts with `[{`, so it's a list.
        # But standard mongoexport is often line-delimited.
        # The `read` tool showed `[{ ... }]`, so it is a JSON array.
        return json_util.loads(f.read())

def seed_mongo(client, movies):
    db = client[MONGO_DB_NAME]
    collection = db["movies"]
    collection.delete_many({}) # Clear existing
    
    if movies:
        collection.insert_many(movies)
        print(f"Inserted {len(movies)} movies into MongoDB.")
        # Create text index for search if needed, but regex is fine for this assignment
        collection.create_index("title")

def seed_neo4j(driver, movies, comments):
    with driver.session() as session:
        # Clear existing
        session.run("MATCH (n) DETACH DELETE n")
        
        # Create constraints based on neo4j.cypher schema
        session.run("CREATE CONSTRAINT movie_title IF NOT EXISTS FOR (m:Movie) REQUIRE m.title IS UNIQUE")
        session.run("CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE")
        
        batch_size = 100
        
        # Insert Movies with full properties from neo4j.cypher schema
        movie_data = []
        for m in movies:
            title = m.get("title", "Unknown")
            released = m.get("year", 2000)  # Use 'year' from MongoDB as 'released'
            tagline = m.get("plot", "")[:200] if m.get("plot") else ""  # Use plot as tagline, truncate if needed
            
            movie_data.append({
                "title": title,
                "released": released,
                "tagline": tagline
            })
        
        for i in range(0, len(movie_data), batch_size):
            batch = movie_data[i:i+batch_size]
            session.run("""
            UNWIND $batch AS row
            MERGE (m:Movie {title: row.title})
            ON CREATE SET m.released = row.released, m.tagline = row.tagline
            """, batch=batch)
        print(f"Inserted {len(movie_data)} movies into Neo4j.")

        # Insert People (Actors, Directors, etc.) and relationships
        people_data = []
        acted_in_data = []
        directed_data = []
        
        for m in movies:
            title = m.get("title", "Unknown")
            
            # Process cast members as actors
            cast = m.get("cast", [])
            for actor_name in cast:
                if actor_name and actor_name.strip():
                    people_data.append({"name": actor_name.strip(), "born": 1970})  # Default birth year
                    acted_in_data.append({
                        "person_name": actor_name.strip(),
                        "movie_title": title,
                        "roles": [f"Role in {title}"]  # Default role since we don't have specific roles
                    })
            
            # Process directors
            directors = m.get("directors", [])
            for director_name in directors:
                if director_name and director_name.strip():
                    people_data.append({"name": director_name.strip(), "born": 1950})  # Default birth year
                    directed_data.append({
                        "person_name": director_name.strip(),
                        "movie_title": title
                    })
        
        # Remove duplicates from people_data
        unique_people = {}
        for person in people_data:
            if person["name"] not in unique_people:
                unique_people[person["name"]] = person
        
        people_data = list(unique_people.values())
        
        # Insert People
        for i in range(0, len(people_data), batch_size):
            batch = people_data[i:i+batch_size]
            session.run("""
            UNWIND $batch AS row
            MERGE (p:Person {name: row.name})
            ON CREATE SET p.born = row.born
            """, batch=batch)
        print(f"Inserted {len(people_data)} people into Neo4j.")

        # Create ACTED_IN relationships
        for i in range(0, len(acted_in_data), batch_size):
            batch = acted_in_data[i:i+batch_size]
            session.run("""
            UNWIND $batch AS row
            MATCH (p:Person {name: row.person_name})
            MATCH (m:Movie {title: row.movie_title})
            MERGE (p)-[:ACTED_IN {roles: row.roles}]->(m)
            """, batch=batch)
        print(f"Created {len(acted_in_data)} ACTED_IN relationships.")

        # Create DIRECTED relationships
        for i in range(0, len(directed_data), batch_size):
            batch = directed_data[i:i+batch_size]
            session.run("""
            UNWIND $batch AS row
            MATCH (p:Person {name: row.person_name})
            MATCH (m:Movie {title: row.movie_title})
            MERGE (p)-[:DIRECTED]->(m)
            """, batch=batch)
        print(f"Created {len(directed_data)} DIRECTED relationships.")

        # Process comments as REVIEWED relationships (Person->Movie)
        reviewed_data = []
        for c in comments:
            movie_id = c.get("movie_id")
            if isinstance(movie_id, dict) and "$oid" in movie_id:
                movie_id = movie_id["$oid"]
            else:
                movie_id = str(movie_id)
            
            # Find the movie title by matching MongoDB _id
            movie_title = None
            for m in movies:
                if str(m.get("_id")) == movie_id:
                    movie_title = m.get("title")
                    break
            
            if movie_title and c.get("name"):
                reviewed_data.append({
                    "person_name": c.get("name"),
                    "movie_title": movie_title
                })
        
        # Create REVIEWED relationships
        for i in range(0, len(reviewed_data), batch_size):
            batch = reviewed_data[i:i+batch_size]
            session.run("""
            UNWIND $batch AS row
            MATCH (p:Person {name: row.person_name})
            MATCH (m:Movie {title: row.movie_title})
            MERGE (p)-[:REVIEWED]->(m)
            """, batch=batch)
        print(f"Created {len(reviewed_data)} REVIEWED relationships from comments.")

def main():
    print("Starting seed process...")
    
    # Check if files exist
    if not os.path.exists(MOVIES_FILE) or not os.path.exists(COMMENTS_FILE):
        print("Error: JSON data files not found in current directory.")
        return

    mongo_client = wait_for_mongo()
    neo4j_driver = wait_for_neo4j()

    print("Loading data files...")
    movies = load_json(MOVIES_FILE)
    comments = load_json(COMMENTS_FILE)
    
    print(f"Loaded {len(movies)} movies and {len(comments)} comments.")

    seed_mongo(mongo_client, movies)
    seed_neo4j(neo4j_driver, movies, comments)

    print("Seeding complete.")
    mongo_client.close()
    neo4j_driver.close()

if __name__ == "__main__":
    main()
