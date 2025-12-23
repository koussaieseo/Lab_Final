"""
Analytics router with data analysis and insights endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from neo4j import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from config.database import movies_collection, get_neo4j_session
from config.models import TopReviewer, TopRatedMovie, MovieCast

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

class GenreStat(BaseModel):
    genre: str
    count: int

class YearStat(BaseModel):
    year: int
    count: int

@router.get("/top-genres", response_model=List[GenreStat])
def get_top_genres(limit: int = 10):
    """Get most popular genres by movie count"""
    try:
        pipeline = [
            {"$unwind": "$genres"},
            {"$group": {"_id": "$genres", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        results = movies_collection.aggregate(pipeline)
        return [{"genre": r["_id"], "count": r["count"]} for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting top genres: {str(e)}")

@router.get("/movies-by-year", response_model=List[YearStat])
def get_movies_by_year(limit: int = 10):
    """Get movie distribution by year (most recent first)"""
    try:
        pipeline = [
            {"$match": {"year": {"$type": "number"}}},
            {"$group": {"_id": "$year", "count": {"$sum": 1}}},
            {"$sort": {"_id": -1}},
            {"$limit": limit}
        ]
        results = movies_collection.aggregate(pipeline)
        return [{"year": r["_id"], "count": r["count"]} for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting movies by year: {str(e)}")

@router.get("/top-rated-movies")
def get_top_rated_movies(limit: int = 10, min_votes: int = 1000):
    """Get top rated movies with minimum vote threshold"""
    cursor = movies_collection.find(
        {"imdb.votes": {"$gte": min_votes}, "imdb.rating": {"$ne": ""}},
        {"title": 1, "imdb": 1, "_id": 0}
    ).sort("imdb.rating", -1).limit(limit)
    
    return list(cursor)

@router.get("/users/path")
def get_shortest_path(
    user1: str, 
    user2: str, 
    session: Session = Depends(get_neo4j_session)
):
    """Find degrees of separation between two people through movie reviews"""
    # Check if people exist
    check_query = "MATCH (p:Person) WHERE p.name IN [$u1, $u2] RETURN count(p) as c"
    check = session.run(check_query, u1=user1, u2=user2).single()
    if check["c"] < 2:
        raise HTTPException(status_code=404, detail="One or both people not found")

    query = """
    MATCH (p1:Person {name: $user1}), (p2:Person {name: $user2}),
    path = shortestPath((p1)-[:REVIEWED*]-(p2))
    RETURN [n in nodes(path) | {labels: labels(n), props: properties(n)}] as nodes
    """
    result = session.run(query, user1=user1, user2=user2).single()
    
    if not result:
        return {"message": "No path found between these people"}
        
    # Format the path
    path_nodes = result["nodes"]
    formatted_path = []
    for node in path_nodes:
        labels = node["labels"]
        props = node["props"]
        if "Person" in labels:
            formatted_path.append({"type": "Person", "name": props.get("name")})
        elif "Movie" in labels:
            formatted_path.append({"type": "Movie", "title": props.get("title")})
            
    return {
        "degrees_of_separation": (len(formatted_path) - 1) // 2,
        "path": formatted_path
    }

@router.get("/top-reviewers", response_model=List[TopReviewer])
def get_top_reviewers(limit: int = 10, session: Session = Depends(get_neo4j_session)):
    """Get people who have reviewed the most movies"""
    try:
        query = """
        MATCH (p:Person)-[:REVIEWED]->(m:Movie)
        RETURN p.name AS name, count(m) AS review_count
        ORDER BY review_count DESC
        LIMIT $limit
        """
        result = session.run(query, limit=limit)
        return [{"name": record["name"], "review_count": record["review_count"]} for record in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting top reviewers: {str(e)}")

@router.get("/top-rated-movies-neo4j", response_model=List[TopRatedMovie])
def get_top_rated_movies_neo4j(limit: int = 10, session: Session = Depends(get_neo4j_session)):
    """Get top rated movies based on Neo4j reviews"""
    try:
        query = """
        MATCH (p:Person)-[r:REVIEWED]->(m:Movie)
        RETURN m.title AS title, avg(r.rating) AS avg_rating, count(p) AS review_count
        ORDER BY avg_rating DESC, review_count DESC
        LIMIT $limit
        """
        result = session.run(query, limit=limit)
        movies = []
        for record in result:
            movies.append({
                "title": record["title"],
                "avg_rating": round(record["avg_rating"], 1),
                "review_count": record["review_count"]
            })
        return movies
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting top rated movies: {str(e)}")

@router.get("/movie-cast/{title}", response_model=MovieCast)
def get_movie_cast(title: str= "Jerry Maguire", session: Session = Depends(get_neo4j_session)):
    """Get cast and crew for a specific movie"""
    try:
        # Check if movie exists
        movie_check = session.run("MATCH (m:Movie {title: $title}) RETURN m", title=title).single()
        if not movie_check:
            raise HTTPException(status_code=404, detail=f"Movie '{title}' not found")
        
        query = """
        MATCH (p:Person)-[r]->(m:Movie)
        WHERE m.title = $title
        RETURN type(r) AS relationship, p.name AS name, 
               CASE WHEN r.roles IS NOT NULL THEN r.roles ELSE null END AS roles
        ORDER BY relationship, name
        """
        result = session.run(query, title=title)
        
        cast_crew = {
            "ACTED_IN": [],
            "DIRECTED": [],
            "PRODUCED": [],
            "WROTE": []
        }
        
        for record in result:
            rel_type = record["relationship"]
            person_info = {
                "name": record["name"]
            }
            if record["roles"]:
                person_info["roles"] = record["roles"]
            
            if rel_type in cast_crew:
                cast_crew[rel_type].append(person_info)
        
        return {
            "movie": title,
            "cast": cast_crew["ACTED_IN"],
            "directors": cast_crew["DIRECTED"],
            "producers": cast_crew["PRODUCED"],
            "writers": cast_crew["WROTE"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting movie cast: {str(e)}")