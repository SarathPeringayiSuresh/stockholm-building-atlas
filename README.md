# Stockholm, on foot

[Open the live walking planner](https://sarathperingayisuresh.github.io/stockholm-building-atlas/) · [Deployment status](https://github.com/SarathPeringayiSuresh/stockholm-building-atlas/actions/workflows/pages.yml)

A focused walking-route planner for Stockholm. Pick architecture, parks and nature, waterfront views, or a mix; choose a walking-time target, 2–8 stops, and a starting point. Get a trail along real mapped paths and open its ordered stops in Google Maps.

## Plan a walk

1. Choose architecture and history, parks and nature, water and viewpoints, or a mix.
2. Set a target of 30–180 minutes and 2–8 stops.
3. Choose one of seven starting points and whether to return to the start.
4. Create your walk, review the mapped trail and stops, then open it in Google Maps.

The bundled snapshot includes **73 outdoor stops**: 23 atlas building landmarks and 50 parks, gardens or viewpoints, connected through 75,094 mapped path points. Data was retrieved on 20 October 2026. Coverage is central Stockholm; the app does not claim to route through every building in the original atlas.

## Run locally

Requirements: Python 3 for the static build/server; Node.js 20+ for tests. GitHub Actions uses Python 3.12 and Node.js 24. No API key or npm installation is required.

```bash
python3 scripts/build_atlas.py
python3 -m http.server 8642 --bind 127.0.0.1 --directory dist
```

Open `http://localhost:8642`. Serve over HTTP: module workers and data fetching do not run by opening `index.html` directly.

```bash
node --test walk/test/*.test.mjs
```

## Host on GitHub Pages

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) tests, builds and publishes the latest walking planner on every push to `main`. It can also be run manually.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or open **Actions → Deploy Stockholm walking planner → Run workflow**.
4. Wait for both **Test and build** and **Publish to GitHub Pages** to succeed.
5. Open <https://sarathperingayisuresh.github.io/stockholm-building-atlas/>.

The build job installs Node.js and Python, runs the route tests, builds `dist`, and uploads that directory as the Pages artifact. The deployment job runs only after the build succeeds. Only deployment receives `pages: write` and `id-token: write` permissions; no personal access token or additional repository secrets are required.

Do not select “Deploy from a branch” for this workflow. The source application is in `walk/`; the deployable site is generated in `dist/`, which is not committed. Relative asset URLs support the repository subdirectory. The original atlas interface is not included in the build. The same static output works on other static hosts.

If deployment fails, inspect the failed step in **Actions**. A Pages configuration error usually means the repository's Pages source has not been set to GitHub Actions. A test failure prevents publication and leaves the last successful site live.

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
