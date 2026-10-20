# Stockholm, on foot

A focused walking-route planner for Stockholm. Pick architecture, parks and nature, waterfront views, or a mix; choose a walking-time target, 2–8 stops, and a starting point. Get a trail along real mapped paths and open its ordered stops in Google Maps.

## Run locally

Requirements: Python 3 for the static build/server; Node.js 20+ for tests. No API key or npm installation is required.

```bash
python3 scripts/build_atlas.py
python3 -m http.server 8642 --bind 127.0.0.1 --directory dist
```

Open `http://localhost:8642`. Serve over HTTP: module workers and data fetching do not run by opening `index.html` directly.

```bash
node --test walk/test/*.test.mjs
```

## Deploy

The GitHub Actions workflow in `.github/workflows/pages.yml` builds `dist` and publishes it to GitHub Pages on pushes to `main`. Choose **Settings → Pages → Source → GitHub Actions** once. Relative asset paths support a repository subdirectory. The same static output also works on Sites hosting.

## How it works

- Vanilla HTML/CSS/JavaScript and Leaflet, with the route search in a module worker.
- Bundled OpenStreetMap graph: Dijkstra shortest paths plus a beam search for stop order, duration and reduced retracing.
- Landmark names and recorded years retained from the previous Hus för hus building atlas.
- OSM parks, gardens and viewpoints add outdoor stops.
- Moving time estimated at 4.5 km/h; breaks are extra. Duration is a target, with actual estimates shown.
- Google Maps walking URLs preserve stop order. Longer walks split into parts with at most three intermediate waypoints per link. Google may choose different paths.

See [walking data, methods and limits](WALK-DATA-SOURCES.md) and [the original atlas data documentation](DATA-SOURCES.md).

## Layout

- `walk/`: the only published application, with its own data, local map library and tests.
- `scripts/build_atlas.py`: builds the walking planner into `dist` (name retained for deployment compatibility).
- `scripts/build_walk_data.py`: creates the route graph and outdoor stop catalogue from OSM extracts.
- `scripts/fetch_walk_data.py`: downloads bounded OSM extracts for a data refresh.
- `web/`, `pipeline/`, `UPSTREAM-README.md`: original atlas source retained for provenance, not shipped by the new build.

## Credits and licences

Original atlas: Hus för hus, Amir Elion; renderer adapted from Alex Barakov's work. Preserve the included MIT licence. OSM-derived data is © OpenStreetMap contributors under ODbL 1.0, separately from the code. Leaflet is BSD-2-Clause. Dataset terms and snapshot details are in the data documentation.
