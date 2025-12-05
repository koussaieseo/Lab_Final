1. Create and activate virtual environment
python -m venv venv


Activate on Windows:

venv\Scripts\activate
Install dependencies

Inside the activated venv:

pip install fastapi uvicorn pymongo neo4j python-dotenv


(Optional, only if the project uses templates):

pip install jinja2
Configure environment variables

Create a .env file at the root of the project:

MONGO_URI=mongodb://localhost:27017
MONGO_DB=sample_mflix

NEO4J_URI=bolt+s://<your_neo4j_instance>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<your_password>
NEO4J_DATABASE=neo4j


Make sure Neo4j Aura is running if you use the cloud database.

✅ 4. Run the FastAPI server

From the project folder:

python -m uvicorn app:app --reload