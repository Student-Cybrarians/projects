from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .catalog import get_api, public_catalog
from .router import ApiRouterError, request_labeled

app = FastAPI(title="Labeled API Gateway", version="0.1.0")


class LabeledRequest(BaseModel):
    method: str = "GET"
    path: str = "/"
    headers: dict[str, str] = Field(default_factory=dict)
    params: dict[str, str] = Field(default_factory=dict)
    body: object | None = None


@app.get("/api/catalog")
def catalog():
    return {"version": 1, "apis": public_catalog()}


@app.get("/api/catalog/{api_id}")
def catalog_item(api_id: str):
    item = get_api(api_id)
    if item is None:
        raise HTTPException(404, "Unknown API label")
    return item


@app.post("/api/{api_id}")
async def labeled_request(api_id: str, request: LabeledRequest):
    try:
        return await request_labeled(
            api_id,
            method=request.method,
            path=request.path,
            headers=request.headers,
            params=request.params,
            json_body=request.body,
        )
    except ApiRouterError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/{api_id}/health")
async def labeled_health(api_id: str):
    try:
        return await request_labeled(api_id, method="GET", path="/")
    except ApiRouterError as exc:
        raise HTTPException(400, str(exc)) from exc
