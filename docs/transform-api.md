# Transform API Contract

This document describes the initial API contract and mock endpoints for the Transform feature scaffold.

Base assumptions
- Auth: bearer token in Authorization header
- Upload flow: client requests a signed upload URL then uploads directly to storage (S3 or equivalent)

Endpoints (examples)

GET /api/v1/users/:userId/transform/photos
- Query: page, limit
- Response: [{ id, url, thumb_url, taken_at, week_number, weight, body_fat, mood, journal_text }]

POST /api/v1/users/:userId/transform/photos
- Request: multipart/form-data OR client requests signed URL from /uploads/signed-url
- Response: { photo_id, upload_status }

GET /api/v1/users/:userId/transform/stats
- Response: cached summary object with counters (days_training, total_workouts, current_streak, xp_earned, photos_uploaded, ...)

POST /api/v1/transform/analysis
- Body: { user_id, photo_id, compare_with_photo_id (optional) }
- Response: { analysis_id, status }

GET /api/v1/transform/analysis/:analysis_id
- Response: { observations: [{ text, type, confidence }], recommendations: [{ text }], generated_at }

Notes
- If a production Ethan AI endpoint exists, replace the analysis endpoints with calls to that service; the scaffold uses a local mock JSON to display sample analyses.

