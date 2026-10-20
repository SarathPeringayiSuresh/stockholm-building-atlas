# Stockholm, on foot — data and routing

## Sources and attribution

- **Walking paths, parks, gardens and viewpoints:** © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). Downloaded from the [OpenStreetMap map API](https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_/api/0.6/map) in small adjacent extracts. Snapshot date, counts and coverage are recorded in `walk/data/places.json`. Each outdoor place retains its OSM object URL. The graph and OSM-derived place collection are offered under ODbL 1.0, separately from the software licence.
- **Architecture:** the existing Hus för hus snapshot, [`v20261018-p4p/stockholm.json`](https://husforhus.se/data/v20261018-p4p/stockholm.json). We retain its landmark IDs and recorded years, converting local SWEREF coordinates to latitude/longitude using the existing `web/sweref.js`. The full atlas's dataset licences remain described in the original `DATA-SOURCES.md`. Dates are atlas records, not a new historical assessment.
- **Nature context:** [Visit Stockholm's Djurgården guide](https://www.visitstockholm.com/stockholms-districts/djurgarden/) informed the nature/walking concept. Place coordinates and park categories are derived from OSM, not scraped from the guide. No tourism prose or photos are reproduced.
- **3D map:** original atlas building footprints/heights, land/water polygons and Ärg age palette. The build selects geometry within 6.5 km of the atlas origin and bundles it with the app. Three.js renders a flat-ground model; heights are building heights, not a terrain-aware walking profile. Dates and colours carry the original atlas's uncertainties. The 3D model replaces external raster basemap tiles.
- **Renderer:** Three.js (MIT) and the original atlas's binary tile worker and SWEREF conversion. Legacy Leaflet files remain in source history but are not included in the current deployment.
- **Typefaces:** DM Sans and Manrope, loaded through Google Fonts; fallback system sans serif works without them.

## How a walk is generated

1. Recommend a Stockholm starting area from the mood: architecture/mixed → Gamla stan, nature → Djurgårdsbron, waterfront → Slussen. Show the selected area and its reason instead of a manual starting-point filter. These are editorial starting recommendations, not a claim that the whole trail stays in that area. Build a graph from mapped public walking paths and pedestrian-accessible streets. Exclude motorways/trunks, known private/no-access ways and nodes, indoor paths, service driveways, and cycleways without explicit pedestrian access. Use OSM shared node IDs for connectivity; do not connect lines simply because they cross on the map. Retain the largest connected walking component.
2. Select named green spaces, gardens, and viewpoints. A checked-in name selection keeps the green-space catalogue focused on visitor-friendly parks. Small planted squares and known private/fee-only places are excluded. Paths inside mapped theme parks and zoos, including Skansen, are removed. Waterfront categorisation uses named waterfront parks and mapped viewpoints. Add the original building landmarks inside the walking coverage.
3. Snap outdoor stop approaches to a nearby mapped path. Parks use boundary approaches; buildings use nearby outdoor viewing locations. These are not verified building entrances. The same snapped coordinates appear in route geometry, markers and Google Maps links.
4. In a browser worker, Dijkstra finds shortest pedestrian-network paths between the start and candidate places. A beam search selects and orders exactly the requested number of unique stops, balancing the requested walking time, category diversity for mixed walks, and less retracing. The selected route's line follows the graph edges, including bridges.
5. Estimate moving time at 4.5 km/h. Stop time is excluded. Duration is a target, not a guarantee: the result always displays its actual calculated estimate and flags differences over ten minutes. If the requested number of suitable stops cannot be found, ask the visitor to change settings instead of fabricating stops.
6. Export ordered snapped stop coordinates using Google's [Maps URL directions](https://developers.google.com/maps/documentation/urls/get-started#directions-action) with `travelmode=walking`. Links contain at most three intermediate waypoints, so longer walks are split into overlapping consecutive parts. Google Maps recalculates paths and does not import the exact route polyline. No Google API key is needed.

## Limits

Central Stockholm only. Routes are suggestions based on a fixed OSM snapshot, not live navigation. Opening hours, seasonal restrictions, construction, temporary closures, weather, lighting and wheelchair accessibility are not validated. Stairs and unpaved paths may be included. Park boundary approaches do not promise access to every part of the park. Building stops are exterior views; indoor visits and admission are outside the walking-time estimate. A round trip may retrace some paths, particularly on islands and at viewpoints.

The planner does not request geolocation or store personal route history. Fonts are fetched from an external provider; map geometry and walking data are bundled locally. Google receives the route coordinates when the visitor opens a Maps link.

## Rebuilding data

`python3 scripts/build_walk_data.py /absolute/path/to/osm-extracts` accepts a directory of OSM XML extracts, or a single Overpass JSON file with way geometry. `walk/data/landmarks.json` preserves the input atlas landmark coordinates. `scripts/fetch_walk_data.py` downloads the same bounded region with two concurrent requests. Rebuild after changing filters; refresh data responsibly and review generated routes.

The repository retains the original atlas source and data for provenance. The published `dist` output contains the walking planner and the selected 3D atlas primitives; atlas timelines, stories, quests, themes, and admin/correction controls are not shipped.
