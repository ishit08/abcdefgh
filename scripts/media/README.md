# Media Pipeline

The app ships one generated hero still at `frontend/public/media/hero-offshore-wind.jpg`.

To reproduce:

1. Use the prompt in `scripts/media/hero.prompt.md` with Cursor image generation or an equivalent approved image model.
2. Save the result as `frontend/public/media/hero-offshore-wind.jpg`.
3. Keep exported dimensions at 16:9; the current asset is 1280x720 and is used as a dimmed background.

All analytical charts and SVG lines are generated from Elexon seed data at runtime, not from static image files.
