install:
	pip install -e ".[dev]"

run:
	python -m app.server

http:
	python -m app.http

test:
	pytest

lint:
	ruff check .

docker:
	docker compose up --build
