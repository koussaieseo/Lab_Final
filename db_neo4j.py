import os
from typing import List, Dict, Any
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME", os.getenv("NEO4J_USER", "neo4j"))
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def users_who_rated(title: str) -> List[str]:
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run(
            """
            MATCH (u:User)-[:RATED]->(m:Movie {title: $title})
            RETURN u.name AS name
            """,
            title=title,
        )
        return [r["name"] for r in result]


def user_profile(name: str) -> Dict[str, Any]:
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run(
            """
            MATCH (u:User {name: $name})-[r:RATED]->(m:Movie)
            RETURN u.name AS name, count(m) AS count, collect(m.title) AS movies
            """,
            name=name,
        )
        record = result.single()
        if not record:
            return {}
        return {
            "name": record["name"],
            "count": record["count"],
            "movies": record["movies"],
        }


def neo4j_movie_titles() -> List[str]:
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("MATCH (m:Movie) RETURN m.title AS title")
        return [r["title"] for r in result]
