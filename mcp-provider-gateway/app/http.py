from __future__ import annotations

import secrets
from typing import Callable

import uvicorn
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .api import app as labeled_api_app
from .config import get_settings
from .server import mcp

settings = get_settings()


class BearerAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path == "/health":
            return await call_next(request)
        if settings.mcp_auth_token:
            header = request.headers.get("authorization", "")
            scheme, _, token = header.partition(" ")
            if scheme.lower() != "bearer" or not secrets.compare_digest(token, settings.mcp_auth_token):
                return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)


async def health(_: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "mcp-provider-gateway"})


app = Starlette(middleware=[Middleware(BearerAuthMiddleware)])
app.mount("/mcp", mcp.streamable_http_app())
app.mount("/api", labeled_api_app)
app.add_route("/health", health, methods=["GET"])


def main() -> None:
    uvicorn.run("app.http:app", host=settings.host, port=settings.port, log_level=settings.log_level.lower())


if __name__ == "__main__":
    main()
