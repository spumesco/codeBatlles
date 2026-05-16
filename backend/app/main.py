from fastapi import FastAPI

app = FastAPI(
    title="CodeBattles API",
    description="Realtime code battle platform backend",
    version="0.1.0",
)


@app.get("/")
def health_check():
    return {"message": "CodeBattles backend is running"}
