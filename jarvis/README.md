# JARVIS Web UI

The static JARVIS interface lives in this directory. Its AI backend is configured by `config.js` and must be deployed separately (currently intended for Vercel).

If the backend is unavailable, built-in browser commands still work and the UI reports the backend as offline instead of pretending an AI request succeeded.
