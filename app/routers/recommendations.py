"""
Recommendation router with movie and user recommendation endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import Session
from typing import List, Optional
from pydantic import BaseModel

from config.database import get_neo4j_session

router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"]
)

class Recommendation(BaseModel):
    movie: str
    score: int

@router.get("/movies/{title}", response_model=List[Recommendation])
def get_movie_recommendations(
    title: str  = "Jerry Maguire",
    limit: int = Query(10, description="Number of recommendations to return"),
    session: Session = Depends(get_neo4j_session)
):
    """Get movie recommendations based on collaborative filtering through reviewers"""
    try:
        # Check if movie exists
        check = session.run("MATCH (m:Movie {title: $title}) RETURN m", title=title).single()
        if not check:
            raise HTTPException(status_code=404, detail=f"Movie '{title}' not found")

        # First try: Collaborative filtering
        collaborative_query = """
        MATCH (m:Movie {title: $title})<-[:REVIEWED]-(p:Person)-[:REVIEWED]->(rec:Movie)
        WHERE rec.title <> $title
        RETURN rec.title AS title, count(p) AS score, rec.released AS year
        ORDER BY score DESC
        LIMIT $limit
        """
        
        result = session.run(collaborative_query, title=title, limit=limit)
        recommendations = []
        for record in result:
            rec = {
                "movie": record["title"], 
                "score": record["score"],
                "year": record.get("year")
            }
            recommendations.append(rec)
        
        # If no collaborative recommendations found, try fallback approaches
        if not recommendations:
            # Fallback 1: Movies in the same genre or by the same director
            similar_query = """
            MATCH (m:Movie {title: $title})<-[:ACTED_IN|DIRECTED|WROTE]-(person:Person)-[:ACTED_IN|DIRECTED|WROTE]->(rec:Movie)
            WHERE rec.title <> $title
            RETURN rec.title AS title, count(person) AS score, rec.released AS year
            ORDER BY score DESC
            LIMIT $limit
            """
            
            result = session.run(similar_query, title=title, limit=limit)
            for record in result:
                rec = {
                    "movie": record["title"], 
                    "score": record["score"],
                    "year": record.get("year")
                }
                recommendations.append(rec)
            
            if not recommendations:
                # Fallback 2: Popular movies from the same year or recent movies
                popular_query = """
                MATCH (m:Movie {title: $title})
                WITH m.released AS target_year
                MATCH (rec:Movie)
                WHERE rec.title <> $title AND rec.released IS NOT NULL
                RETURN rec.title AS title, 
                       CASE 
                         WHEN rec.released = target_year THEN 3
                         WHEN rec.released > target_year THEN 2
                         ELSE 1
                       END AS score,
                       rec.released AS year
                ORDER BY score DESC, rec.released DESC
                LIMIT $limit
                """
                
                result = session.run(popular_query, title=title, limit=limit)
                for record in result:
                    rec = {
                        "movie": record["title"], 
                        "score": record["score"],
                        "year": record.get("year")
                    }
                    recommendations.append(rec)
        
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recommendations: {str(e)}")

@router.get("/users/{user_name}", response_model=List[Recommendation])
def get_user_recommendations(
    user_name: str  = "James Thompson",
    limit: int = Query(10, description="Number of recommendations to return"),
    session: Session = Depends(get_neo4j_session)
):
    """Get person recommendations based on collaborative filtering through reviews"""
    try:
        # Check if person exists
        check = session.run("MATCH (p:Person {name: $name}) RETURN p", name=user_name).single()
        if not check:
            raise HTTPException(status_code=404, detail=f"Person '{user_name}' not found")

        # First try: Collaborative filtering with similar users
        collaborative_query = """
        MATCH (p1:Person {name: $name})-[:REVIEWED]->(m:Movie)<-[:REVIEWED]-(p2:Person)
        WITH p1, p2, count(m) AS similarity
        WHERE similarity >= 1
        MATCH (p2)-[:REVIEWED]->(rec:Movie)
        WHERE NOT (p1)-[:REVIEWED]->(rec)
        RETURN rec.title AS title, sum(similarity) AS score
        ORDER BY score DESC
        LIMIT $limit
        """
        
        result = session.run(collaborative_query, name=user_name, limit=limit)
        recommendations = [{"movie": record["title"], "score": record["score"]} for record in result]
        
        # If no collaborative recommendations found, try fallback approaches
        if not recommendations:
            # Fallback 1: Popular movies that the user hasn't reviewed
            popular_query = """
            MATCH (p:Person {name: $name})
            MATCH (rec:Movie)<-[:REVIEWED]-(other:Person)
            WHERE NOT (p)-[:REVIEWED]->(rec)
            RETURN rec.title AS title, count(other) AS score
            ORDER BY score DESC
            LIMIT $limit
            """
            
            result = session.run(popular_query, name=user_name, limit=limit)
            recommendations = [{"movie": record["title"], "score": record["score"]} for record in result]
            
            if not recommendations:
                # Fallback 2: Recent movies or highest rated movies
                recent_query = """
                MATCH (p:Person {name: $name})
                MATCH (rec:Movie)
                WHERE NOT (p)-[:REVIEWED]->(rec) AND rec.released IS NOT NULL
                RETURN rec.title AS title, rec.released AS score
                ORDER BY score DESC
                LIMIT $limit
                """
                
                result = session.run(recent_query, name=user_name, limit=limit)
                recommendations = [{"movie": record["title"], "score": record["score"]} for record in result]
        
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting person recommendations: {str(e)}")