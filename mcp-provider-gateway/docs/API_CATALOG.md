# Labeled API Catalog

The gateway uses stable IDs for integrations and human-readable labels for UI, MCP routing, logs, and future policy controls.

Source of truth:

`config/api-catalog.yaml`

## Labels

| ID | Label | Category | Transport |
|---|---|---|---|
| `GOOGLE_OAUTH_2_0` | Google OAuth 2.0 | identity | HTTPS |
| `GOOGLE_IDENTITY_SERVICES` | Google Identity Services | identity | HTTPS |
| `SUPABASE_POSTGRESQL` | Supabase PostgreSQL | database | HTTPS |
| `SUPABASE_STORAGE_API` | Supabase Storage | storage | HTTPS |
| `REDIS_API` | Redis API | cache | HTTPS |
| `NVIDIA_NIM_API` | NVIDIA NIM | AI inference | HTTPS |
| `DEEPSEEK_API` | DeepSeek | AI inference | HTTPS |
| `QWEN_API` | Qwen | AI inference | HTTPS |
| `BGE_M3_API` | BGE-M3 Embeddings | embeddings | HTTPS |
| `NVIDIA_RERANK_API` | NVIDIA Rerank | reranking | HTTPS |
| `NV_EMBEDCODE_API` | NVIDIA EmbedCode | embeddings | HTTPS |
| `GLINER_PII_API` | GLiNER PII Detection | PII detection | HTTPS |
| `WHISPER_API` | Whisper Speech-to-Text | speech-to-text | HTTPS |
| `NVIDIA_ACTIVE_SPEAKER_API` | NVIDIA Active Speaker | audio/video | HTTPS |
| `NEMOTRON_VOICECHAT_API` | Nemotron Voice Chat | voice AI | HTTPS |
| `WEBSOCKET_API` | WebSocket API | realtime | WebSocket |
| `WEBRTC_API` | WebRTC API | realtime media | WebRTC |
| `GITHUB_API` | GitHub API | developer tools | HTTPS |
| `STRIPE_API` | Stripe API | payments | HTTPS |
| `GOOGLE_CALENDAR_API` | Google Calendar API | productivity | HTTPS |
| `SENDGRID_API` | SendGrid API | messaging | HTTPS |
| `AWS_S3_API` | AWS S3 API | storage | HTTPS |
| `GITHUB_ACTIONS_API` | GitHub Actions API | CI/CD | HTTPS |
| `SENTRY_API` | Sentry API | observability | HTTPS |

## Activation model

All entries are initially disabled. Adding a label does **not** claim that the corresponding integration is implemented or authenticated.

Before enabling an integration, add its adapter, endpoint configuration, authentication method, scopes/permissions where applicable, health check, and tests.

Secrets must remain in environment variables or a secret manager. Never put API keys, OAuth client secrets, signing secrets, or access tokens in this catalog.

## Recommended next implementation order

1. NVIDIA NIM / DeepSeek / Qwen — inference
2. BGE-M3 / NVIDIA EmbedCode / NVIDIA Rerank — retrieval pipeline
3. Whisper / Nemotron Voice Chat / Active Speaker — speech and audio
4. GitHub / GitHub Actions / Sentry — coding and DevOps automation
5. Google OAuth / Identity / Calendar — identity and productivity
6. Supabase / Redis / S3 — persistence and storage
7. Stripe / SendGrid — business operations
8. WebSocket / WebRTC — realtime transport
9. GLiNER PII — privacy pipeline
