"""
Simplified main application module
"""
from fastapi import FastAPI, HTTPException, Depends
from typing import List, Optional
from neo4j import Session
from config.database import movies_collection, get_neo4j_session, close_connections
from config.models import (
    MovieUpdate, UserRatingStats, CommonMoviesCount, MovieRaters, 
    MovieReviews, PersonMovies, MovieCast
)
from routers import recommendations, analytics


app = FastAPI(
    title="Movie Analytics & Recommendation System",
    description="A FastAPI application for movie analytics and recommendations",
    version="1.0.0"
)

# Include routers
app.include_router(recommendations.router)
app.include_router(analytics.router)

# Helper function to fix MongoDB ObjectId
def fix_mongo_doc(doc):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@app.on_event("shutdown")
def shutdown_event():
    """Close database connections on shutdown"""
    close_connections()

# Movie endpoints
@app.get("/movies")
def list_movies(limit: int = 100):
    """List all movies from MongoDB"""
    if movies_collection is None:
        return {"message": "MongoDB is not available", "movies": []}
    cursor = movies_collection.find().limit(limit)
    return [fix_mongo_doc(doc) for doc in cursor]

@app.get("/movies/search")
def search_movie(name: Optional[str] = "Jerry Maguire", actor: Optional[str] = None):
    """Search movies by name or actor (defaults to 'Jerry Maguire')"""
    if movies_collection is None:
        return {"message": "MongoDB is not available", "movies": []}
    
    query = {}
    if name:
        query["title"] = {"$regex": name, "$options": "i"}
    elif actor:
        query["cast"] = {"$regex": actor, "$options": "i"}
    
    cursor = movies_collection.find(query).limit(50)
    return [fix_mongo_doc(doc) for doc in cursor]

@app.put("/movies/{name}")
def update_movie(movie_update: MovieUpdate,name: str = "Jerry Maguire"):
    """Update movie information (defaults to 'Jerry Maguire')"""
    if movies_collection is None:
        raise HTTPException(status_code=503, detail="MongoDB is not available")
    
    update_data = {k: v for k, v in movie_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = movies_collection.update_one({"title": name}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    return {"message": "Movie updated successfully", "modified_count": result.modified_count}

# User and analytics endpoints
@app.get("/movies/common", response_model=CommonMoviesCount)
def get_common_movies(session: Session = Depends(get_neo4j_session)):
    """Count movies common between MongoDB and Neo4j"""
    mongo_titles = set(doc["title"] for doc in movies_collection.find({}, {"title": 1}))
    
    result = session.run("MATCH (m:Movie) RETURN m.title AS title")
    neo4j_titles = set(record["title"] for record in result)
    
    common = mongo_titles.intersection(neo4j_titles)
    
    return {
        "mongo_count": len(mongo_titles),
        "neo4j_count": len(neo4j_titles),
        "common_count": len(common),
        "common_titles": sorted(list(common))  # Return sorted list of common titles
    }

@app.get("/movies/{name}/raters", response_model=MovieRaters)
def list_movie_raters(name: str = "Jerry Maguire", session: Session = Depends(get_neo4j_session)):
    """List people who reviewed a specific movie (defaults to 'Jerry Maguire')"""
    try:
        # Check if movie exists
        movie_check = session.run("MATCH (m:Movie {title: $title}) RETURN m", title=name).single()
        if not movie_check:
            raise HTTPException(status_code=404, detail=f"Movie '{name}' not found")
        
        query = """
        MATCH (p:Person)-[:REVIEWED]->(m:Movie)
        WHERE m.title = $title
        RETURN p.name AS person_name
        """
        result = session.run(query, title=name)
        raters = [record["person_name"] for record in result]
        
        return {
            "movie": name,
            "raters": raters,
            "raters_count": len(raters)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting movie raters: {str(e)}")

@app.get("/users/{name}", response_model=UserRatingStats)
def get_user_stats(name: str = "Jessica Thompson", session: Session = Depends(get_neo4j_session)):
    """Get person review statistics (defaults to 'Jessica Thompson' who rated Jerry Maguire)"""
    query = """
    MATCH (p:Person {name: $name})-[:REVIEWED]->(m:Movie)
    RETURN count(m) AS count, collect(m.title) AS movies
    """
    result = session.run(query, name=name)
    record = result.single()
    
    if not record or record["count"] == 0:
        user_check = session.run("MATCH (p:Person {name: $name}) RETURN p", name=name).single()
        if not user_check:
            raise HTTPException(status_code=404, detail="Person not found")
        return {"user": name, "rated_movie_count": 0, "rated_movies": []}
        
    return {
        "user": name,
        "rated_movie_count": record["count"],
        "rated_movies": record["movies"]
    }

@app.get("/users")
def list_users(skip: int = 0, limit: int = 20, session: Session = Depends(get_neo4j_session)):
    """List all people with pagination"""
    query = """
    MATCH (p:Person)
    RETURN p.name AS name
    ORDER BY p.name
    SKIP $skip LIMIT $limit
    """
    result = session.run(query, skip=skip, limit=limit)
    return [record["name"] for record in result]

@app.get("/movies/{name}/reviews", response_model=MovieReviews)
def get_movie_reviews(name: str, session: Session = Depends(get_neo4j_session)):
    """Get reviews for a specific movie"""
    try:
        # Check if movie exists
        movie_check = session.run("MATCH (m:Movie {title: $title}) RETURN m", title=name).single()
        if not movie_check:
            raise HTTPException(status_code=404, detail=f"Movie '{name}' not found")
        
        query = """
        MATCH (p:Person)-[r:REVIEWED]->(m:Movie)
        WHERE m.title = $title
        RETURN p.name AS reviewer, r.rating AS rating, r.summary AS summary
        ORDER BY r.rating DESC
        """
        result = session.run(query, title=name)
        reviews = []
        for record in result:
            reviews.append({
                "reviewer": record["reviewer"],
                "rating": record["rating"],
                "summary": record["summary"]
            })
        
        return {
            "movie": name,
            "reviews": reviews,
            "review_count": len(reviews)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting movie reviews: {str(e)}")

@app.get("/people/{name}/movies", response_model=PersonMovies)
def get_person_movies(name: str, session: Session = Depends(get_neo4j_session)):
    """Get all movies a person is connected to"""
    try:
        # Check if person exists
        person_check = session.run("MATCH (p:Person {name: $name}) RETURN p", name=name).single()
        if not person_check:
            raise HTTPException(status_code=404, detail=f"Person '{name}' not found")
        
        query = """
        MATCH (p:Person)-[r]->(m:Movie)
        WHERE p.name = $name
        RETURN type(r) AS relationship, m.title AS movie, 
               CASE 
                 WHEN r.roles IS NOT NULL THEN r.roles
                 WHEN r.rating IS NOT NULL THEN r.rating
                 ELSE null 
               END AS detail
        ORDER BY m.title
        """
        result = session.run(query, name=name)
        movies = []
        for record in result:
            movies.append({
                "relationship": record["relationship"],
                "movie": record["movie"],
                "detail": record["detail"]
            })
        
        return {
            "person": name,
            "movies": movies,
            "movie_count": len(movies)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting person movies: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)