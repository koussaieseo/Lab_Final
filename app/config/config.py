"""
Application configuration and settings
"""
import os
from pathlib import Path

# Database configurations
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://root:root@cluster0.fte05gm.mongodb.net/?appName=Cluster0")
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://b9631db9.databases.neo4j.io")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "p-gcYoJgDqugNmgR1Bj6SucZg9Y2ZgxrF5biMzJ9u64")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "sample_mflix")
# App settings
APP_NAME = "Movie Analytics & Recommendation System"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "False").lower() == "true"