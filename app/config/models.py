from pydantic import BaseModel
from typing import List, Optional, Any

class MovieUpdate(BaseModel):
    plot: Optional[str] = None
    year: Optional[int] = None
    imdb: Optional[Any] = None  # Could be nested dict or simplified
    
class UserRatingStats(BaseModel):
    user: str
    rated_movie_count: int
    rated_movies: List[str]

class CommonMoviesCount(BaseModel):
    mongo_count: int
    neo4j_count: int
    common_count: int
    common_titles: List[str]

class MovieRaters(BaseModel):
    movie: str
    raters: List[str]
    raters_count: int

class Review(BaseModel):
    reviewer: str
    rating: int
    summary: str

class MovieReviews(BaseModel):
    movie: str
    reviews: List[Review]
    review_count: int

class PersonMovie(BaseModel):
    relationship: str
    movie: str
    detail: Optional[Any] = None

class PersonMovies(BaseModel):
    person: str
    movies: List[PersonMovie]
    movie_count: int

class MovieCastMember(BaseModel):
    name: str
    roles: Optional[List[str]] = None

class MovieCast(BaseModel):
    movie: str
    cast: List[MovieCastMember]
    directors: List[MovieCastMember]
    producers: List[MovieCastMember]
    writers: List[MovieCastMember]

class TopReviewer(BaseModel):
    name: str
    review_count: int

class TopRatedMovie(BaseModel):
    title: str
    avg_rating: float
    review_count: int
