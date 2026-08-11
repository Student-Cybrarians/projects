# OpenJarvis integration

This repository tracks the upstream [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) project as a Git submodule at `OpenJarvis/`, pinned to the upstream `main` commit used by this integration.

## Build and publish

The workflow `.github/workflows/openjarvis-container.yml` checks out the submodule, builds the upstream production Docker image from `OpenJarvis/deploy/docker/Dockerfile`, and publishes it to GitHub Container Registry as `ghcr.io/<owner>/openjarvis`.

Run it automatically by updating the submodule pointer on `master-branch`, or manually from **Actions → Build and publish OpenJarvis → Run workflow**.

## Local checkout

```bash
git clone https://github.com/Student-Cybrarians/projects.git
cd projects
git checkout master-branch
git submodule update --init --recursive
```

The upstream project documents the full runtime deployment, including the Ollama-backed Compose stack and GPU variants. The production Dockerfile exposes the OpenJarvis server on port `8000`.

Upstream: https://github.com/open-jarvis/OpenJarvis
