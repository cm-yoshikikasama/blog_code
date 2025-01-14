from fastapi import FastAPI
from mangum import Mangum

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}


@app.post("/items/")
async def create_item(name: str):
    return {"name": name}


handler = Mangum(app)
