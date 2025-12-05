from fastapi import FastAPI, HTTPException, Query, Body, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Set

from db_mongo import list_all_movies, find_by_title_or_actor, update_movie, distinct_titles
from db_neo4j import users_who_rated, user_profile, neo4j_movie_titles

app = FastAPI(title="Movies API (MongoDB + Neo4j)", version="1.0.0")

# UI
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


class MovieUpdate(BaseModel):
    year: Optional[int] = None
    genres: Optional[List[str]] = None
    cast: Optional[List[str]] = None
    extra: Optional[Dict[str, Any]] = None


@app.get("/health")
def health():
    return {"status": "ok"}


# MongoDB
@app.get("/movies", summary="List all movies (MongoDB)")
def api_list_all_movies(limit: int = 50):
    return list_all_movies(limit=limit)


@app.get("/movies/search", summary="Find movie(s) by title or actor (MongoDB)")
def api_find_movie(
    title: Optional[str] = Query(None),
    actor: Optional[str] = Query(None),
    limit: int = 50,
):
    data = find_by_title_or_actor(title, actor, limit=limit)
    if not data:
        raise HTTPException(status_code=404, detail="No matching movie found")
    return data


@app.patch("/movies/{title}", summary="Update a specific movie by title (MongoDB)")
def api_update_movie(title: str, payload: MovieUpdate = Body(...)):
    update_dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Empty update payload")
    modified = update_movie(title, update_dict)
    if modified == 0:
        raise HTTPException(status_code=404, detail="Movie not found or no change")
    return {"updated": modified}


# Mongo + Neo4j
@app.get("/stats/common-movies", summary="Number of movies common to MongoDB & Neo4j")
def api_common_movies():
    mongo_titles: Set[str] = set(map(str.lower, distinct_titles()))
    neo_titles: Set[str] = set(map(str.lower, neo4j_movie_titles()))
    intersection = mongo_titles & neo_titles
    return {"count": len(intersection), "titles": sorted(intersection)}


# Neo4j
@app.get("/ratings/movie/{title}/users", summary="List users who rated a movie (Neo4j)")
def api_users_who_rated(title: str):
    users = users_who_rated(title)
    if not users:
        raise HTTPException(status_code=404, detail="No ratings or movie not found")
    return {"movie": title, "users": users}


@app.get("/users/{name}/ratings", summary="User profile: count + list of rated movies (Neo4j)")
def api_user_profile(name: str):
    prof = user_profile(name)
    if not prof:
        raise HTTPException(status_code=404, detail="User not found or has no ratings")
    return prof
