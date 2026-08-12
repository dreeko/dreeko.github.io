# dreeko.space

Landing page and live status board for the public services running on my homelab.

Served by GitHub Pages at <https://dreeko.space>. The source of truth is **not** this
repo — it is `~/stacks/dreeko-space/site/` on the homelab, version-controlled in
`dreeko/homelab-stacks` on my own Forgejo, and pushed here by `deploy-site.sh`.
Edit it there, not here.

## Why GitHub Pages

Every service listed on the page is reverse-proxied through a single small VPS. A status
board hosted alongside them would be unreachable during exactly the outage it exists to
report. Hosting the page off my own infrastructure means it survives the homelab, and the
VPS, being down.

The status data still comes from the VPS — `status.dreeko.space/status.json`, rewritten
every 60 seconds by a systemd timer. If that endpoint is unreachable, the page says so
rather than showing stale green.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | The page. The service list is static, so it works without JavaScript. |
| `status.js` | Fetches the feed and fills in the status pills. Additive only. |
| `styles.css` | Palette and type shared with [dreeko.me](https://dreeko.me). |
| `fonts/` | Self-hosted woff2. No external requests from this page, by design. |
| `CNAME` | `dreeko.space`. Deleting this breaks the custom domain. |
| `.nojekyll` | Serve these files as-is; no Jekyll build. |
