# Stockholm Through Time

An interactive 3D atlas of Stockholm's buildings, coloured by construction period, with a historical timeline, address search and building details sourced from open data.

This repository contains the original **Building Atlas map design** selected for the project. It does not include the later, experimental chapter-based redesign.

[View the atlas](https://stockholm-building-atlas.sarathperingayisures.chatgpt.site/?theme=arg) · [Data sources](DATA-SOURCES.md) · [Implementation notes](ATLAS.md)

The existing hosted site is private and requires access. The source in this repository can be built and hosted independently.

## Features

- Explore **77,743 buildings** in a draggable, zoomable 3D map.
- Colour and filter buildings by twelve construction periods or by floor count.
- Scrub or play the timeline to explore the dated buildings that survive today.
- Search for a building, address, street or district.
- Open building cards with dates, evidence, heights, floor counts and available descriptions or photographs.
- Switch between visual themes and English/Swedish map controls.
- Explore the snapshot's available stories, walks, quests and supplementary layers.

## Quick start

Requirements: Python 3 to build and serve the site, and a browser with JavaScript and WebGL. Node.js 22 or newer is needed only for the viewer tests.

```sh
git clone https://github.com/SarathPeringayiSuresh/stockholm-through-time.git
cd stockholm-through-time
python3 scripts/build_atlas.py
python3 -m http.server 8642 --bind 127.0.0.1 --directory dist
```

Open [http://localhost:8642](http://localhost:8642). Stop the server with `Ctrl+C`.

No npm installation, API key, application backend or database is required to run the atlas. Alternatively, with Node/npm installed, use `npm run build` and `npm start`.

The build recreates `dist/` from `web/`. Make changes in `web/` and rebuild; direct edits to `dist/` will be overwritten. Core map data is bundled locally. Some Wikimedia photographs require an internet connection.

## Architecture

```text
Original open datasets
        ↓
Upstream Python geospatial pipeline
        ↓
Processed Stockholm snapshot: geometry + attributes + JSON indexes
        ↓
Three.js / WebGL viewer with browser workers
        ↓
Static website in dist/
```

The viewer loads compressed geometry packs and a compact attribute buffer. GPU shaders apply colours and date filters. Building cards, Wikipedia excerpts and address-search data load in small JSON shards as needed.

This edition adapts the MIT-licensed [Hus för hus](https://github.com/amirelion/husforhus) Stockholm implementation and preserves its rendering and data methods. Its visual reference was [LAYRS London](https://stop-token.com/lab/london/). The renderer was not written from scratch for this project.

## Data provenance

The bundled data is the processed **`v20261018-p4p`** snapshot downloaded from Hus för hus. This edition did not independently collect all original datasets, rerun the geospatial pipeline or verify every building date.

| Original source used upstream | Contribution |
| --- | --- |
| Stockholms stad: SBK 3D-Byggnader | Building footprints, heights and building types |
| Stockholms stad: Stadsdelar and Stadskarta | District boundaries, land, water, labels and contour lines |
| Riksantikvarieämbetet: Bebyggelseregistret | Construction dates and heritage information |
| Wikidata and OpenStreetMap | Additional dates, identities, links and floor counts |
| Wikipedia and Wikimedia Commons | Descriptions and individually credited photographs |
| Lantmäteriet, where included upstream | Derived tower and elevation information |

The snapshot's ground terrain is identified as contour-derived. Exact source URLs and attribution declarations are in [`pipeline/sources.yml`](pipeline/sources.yml).

| Date category | Buildings |
| --- | ---: |
| Unknown construction year | 43,452 |
| Neighbour-based estimates | 4,558 |
| Area-based dates | 6,263 |
| Other sourced dates, including ranges | 23,470 |
| **Total** | **77,743** |

The viewer distinguishes unknown dates from estimates and sourced dates. See [How the years work](HOW-YEARS-WORK.md) for the upstream date-selection and estimation rules.

**The timeline filters buildings that survive today. It does not reconstruct demolished buildings or show the complete historical city.** This is a fixed snapshot, not a live construction feed. Viewer tests establish software behaviour, not the historical accuracy of every record.

## Downloading or rebuilding data

The processed snapshot is committed under `web/data/`, so a fresh clone can build immediately. To download missing snapshot files, with Python 3 and `curl` available:

```sh
python3 scripts/fetch_snapshot.py
python3 scripts/build_atlas.py
```

The downloader fetches the pinned version, skips existing files and records SHA-256 checksums in [`snapshot-manifest.json`](snapshot-manifest.json). It does not automatically upgrade the dataset or compare existing files against a previous checksum manifest. The initial download contained 173 files, approximately 10.1 MiB.

For an independent rebuild from original datasets, consult the [preserved upstream README](UPSTREAM-README.md). That separate workflow requires additional geospatial dependencies and larger downloads. Optional detailed elevation or laser processing can require Lantmäteriet access. Its references to original deployment infrastructure describe the upstream project.

## Tests

```sh
node --test web/test/*.test.mjs
# Equivalent:
npm test
```

The original edition passed 367 viewer tests. Browser checks covered rendering, landmark search, building details, floor colouring and timeline playback. Inherited pipeline and browser suites remain available in the source but are not required to serve the static viewer.

## Project structure

| Path | Purpose |
| --- | --- |
| `web/index.html` | Page shell and map controls |
| `web/app.js` | Map rendering, interaction and application state |
| `web/atlas.css` | Edition-specific presentation |
| `web/data/` | Bundled processed Stockholm snapshot |
| `web/vendor/` | Bundled browser dependencies |
| `web/test/` | Viewer unit tests |
| `scripts/build_atlas.py` | Static build |
| `scripts/fetch_snapshot.py` | Pinned snapshot downloader |
| `pipeline/` | Preserved upstream geospatial pipeline |
| `src/` | Upstream server code retained for reference; unused by this edition |
| `dist/` | Generated website; ignored by Git |

## Deployment

Run `python3 scripts/build_atlas.py`, then publish the **contents of `dist/`** with a static hosting provider. A backend is unnecessary.

Serve JavaScript, JSON, fonts and binary files with appropriate content types. The application decompresses `.bin.gz` files itself; do not set `Content-Encoding: gzip` merely because of their extension.

This repository excludes the original author's Cloudflare deployment bindings, custom-domain routes and inherited GitHub workflows, as well as the existing private Sites deployment identity. Configure any new hosting destination separately.

Correction-entry buttons were removed because this static edition has no submissions backend. Upstream contribution and privacy documents describe the original author's processes, not a reporting service operated by this repository.

## Credits and licences

- [Hus för hus](https://github.com/amirelion/husforhus): Stockholm application and processed data, Amir Elion and contributors.
- [Amsterdam, building by building](https://github.com/alexbarakov/amsterdam-by-building): renderer lineage, Alex Barakov.
- [LAYRS London](https://stop-token.com/lab/london/): initial design reference.

Code is distributed under the [MIT licence](LICENSE), with original copyright notices retained. Data keeps its own licences, including CC BY, CC0 and ODbL as documented in [DATA-SOURCES.md](DATA-SOURCES.md). Wikipedia excerpts, photographs, fonts and third-party libraries retain their respective attribution and licence requirements.
