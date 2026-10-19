# Stockholm Building Atlas

An independent adaptation of the open-source Hus för hus Stockholm viewer, inspired by the requested LAYRS London reference. This is a working adaptation, not an original renderer or an independently verified city survey.

## Run

With Python 3 and Node.js available:

```sh
python3 scripts/build_atlas.py
python3 -m http.server 8642 --directory dist
```

Visit http://localhost:8642. No npm install, API key or application server is required. WebGL is required. Wikimedia photos are external; map geometry, search and building metadata are bundled locally.

## Reverse-engineering findings

The reference at https://stop-token.com/lab/london/ exposes its source at https://github.com/alexbarakov/london-by-building. Its interface combines a full-screen 3D building model, a period palette, building picking, search, contextual layers, walks, quests and a histogram timeline. The timeline filters buildings that survive today; it cannot reconstruct all demolished buildings.

During source research, https://github.com/amirelion/husforhus was found to already adapt the related Amsterdam renderer for Stockholm under MIT. Reusing this compatible Stockholm implementation avoids rewriting the renderer and spatial data joins. Original copyrights are retained in LICENSE and in the served LICENSE.txt.

The architecture is:

1. Python pipeline obtains municipal building footprints/heights, terrain, heritage records, OSM and Wikidata enrichment.
2. Spatial joins and source-priority rules assign dates, ranges and estimates. Unknown dates remain unknown.
3. A compact attributes buffer and eight gzipped geometry packs support rendering; cards, Wikipedia excerpts and address search use JSON shards loaded on demand.
4. Three.js, custom shaders and web workers render/pick buildings. Timeline and period selections update shader/filter state. Search converts named places and addresses into camera targets.
5. Static HTML, CSS and browser JavaScript serve the viewer with no application backend.

## This edition

- Stockholm Building Atlas title and masthead, independent edition notice and upstream attribution.
- Full municipal snapshot: 77,743 buildings; 43,452 unknown years; 4,558 estimated dates. Other records include exact dates and ranges. These are upstream statistics, not independently audited findings.
- Preserved 3D navigation, period/floor filtering, timeline playback/range selection, building details, search, themes, English/Swedish controls, stories and available exploration tools.
- Removed correction-entry buttons because this static edition does not have a submissions backend. It does not forward reports to the upstream author's service.
- Pinned local data snapshot v20261018-p4p, downloaded from https://husforhus.se/data/v20261018-p4p/. Download checksums are recorded in snapshot-manifest.json. The build changes only edition-specific display metadata in the output.
- Retained source licences and dataset attribution; see DATA-SOURCES.md and the in-app About panel. Dataset licences are separate from the MIT code licence.

## Refreshing

`scripts/fetch_snapshot.py` downloads the pinned public snapshot using curl, with four simultaneous requests and SHA-256 checksums. It skips existing files. This is a snapshot, not a live update feed. For an independent rebuild, use the original pipeline described in UPSTREAM-README.md; its upstream Python dependency versions must be installed, and optional detailed terrain/tower processing needs separate Lantmäteriet access.

## Validation

The inherited viewer's 367 Node unit tests passed after the edition changes. Browser checks are recorded in the task handoff. Construction dates and historical narrative have not been independently fact-checked building by building.
