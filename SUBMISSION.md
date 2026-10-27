# Submission checklist (REint Full Stack SWE v4)

## Done in this repo

- [x] React + Python + Docker
- [x] Elexon FUELHH (WIND) + WINDFOR for January 2026 (seed files committed)
- [x] Forecast accuracy metrics and dashboard
- [x] README + prefetch script

## You still need to do (requires your accounts)

### 1. GitHub (public, anonymous name)

```bash
cd /Users/ishitsubhram/elexon-wind-dashboard
gh auth login   # fix invalid token if needed
gh repo create RANDOM_NAME --public --source=. --remote=origin --push
```

Replace `RANDOM_NAME` with something like `k7m2p9-wind`.

### 2. Deploy backend (Render example)

- New Web Service → connect repo → **Root directory:** `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env: `FRONTEND_ORIGIN=https://YOUR-VERCEL-APP.vercel.app`

### 3. Deploy frontend (Vercel)

```bash
cd frontend
vercel login   # if needed
vercel --prod
```

Set `VITE_API_BASE_URL` to your backend URL in the Vercel project settings, then redeploy.

### 4. Update README submission links table

Commit and push.

### 5. YouTube video (max 10 minutes)

- Part 1 (~5 min): client demo on **live deployed URL**
- Part 2 (~5 min): architecture, Elexon datasets, seed vs live, Docker, tests

Upload **unlisted**, verify in incognito.

### 6. Submit the official Google form

Include repo URL, app URL, video URL. Open all links in incognito before submitting.
