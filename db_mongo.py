import os
from typing import List, Optional, Dict, Any
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client[os.getenv("MONGO_DB", "sample_mflix")]
movies = db.movies

movies.create_index([("title", ASCENDING)])
movies.create_index([("cast", ASCENDING)])


def list_all_movies(limit: int = 50) -> List[Dict[str, Any]]:
    return list(movies.find({}, {"_id": 0}).limit(limit))


def find_by_title_or_actor(
    title: Optional[str] = None,
    actor: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    if title:
        q = {"title": {"$regex": f"{title}", "$options": "i"}}
    elif actor:
        q = {"cast": {"$regex": actor, "$options": "i"}}
    else:
        return []
    return list(movies.find(q, {"_id": 0}).limit(limit))


def update_movie(title: str, payload: Dict[str, Any]) -> int:
    res = movies.update_one(
        {"title": {"$regex": f"{title}", "$options": "i"}},
        {"$set": payload},
        upsert=False,
    )
    return res.modified_count


def distinct_titles() -> List[str]:
    return movies.distinct("title")
