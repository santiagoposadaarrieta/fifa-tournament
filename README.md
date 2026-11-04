# FIFA Campus Cup

3 public pages (home, bracket, join) + a private `/admin` page for the draw.
Free stack: GitHub + Vercel + Upstash Redis (free tier, added from Vercel).

## Deploy
1. Create a GitHub repo, upload ALL files in this folder (keep the `api` folder).
2. Vercel > Add New > Project > import the repo > Deploy (no settings to change).
3. Vercel project > Storage > Create > Upstash Redis (free plan) > connect to this project. This adds the database env vars automatically.
4. Vercel project > Settings > Environment Variables > add `ADMIN_PASSWORD` = a password only you know.
5. Deployments > latest > Redeploy (env vars only apply to new deploys).
6. Open `/admin`, log in, and confirm the pool shows 0 of 32.

## Event day
- Players join at `/join` with their codes.
- Open `/admin`, project it, click "Run the draw". The bracket on `/bracket` fills instantly for everyone.
- Click winners in `/admin` to advance them.
- "Restart everything" in `/admin` wipes the draw, players and codes, and creates 32 new codes (shown in the Codes section; copy or download them).

Change the tournament name in `shared.js` (TOURNAMENT) and the title tags in the HTML files.
Edit the pick-a-name list in `api/_config.js` (NAMES; keep at least 32 entries).
