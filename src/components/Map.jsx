import { useState, useEffect, useRef, useMemo } from "react";
import { Map, NavigationControl, Source, Layer, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  normalizeCollaborationMunisField,
  participatingMunicipalityTowns,
} from "../utils/geographicFocus";

/** One distinct color per quintile (low → high counts). */
const CHOROPLETH_BUCKET_COLORS = [
  "#dbeafe",
  "#93c5fd",
  "#3b82f6",
  "#1d4ed8",
  "#172554",
];

/** At most this many positive-count buckets; above that we quantize with quintiles. */
const CHOROPLETH_MAX_POSITIVE_BUCKETS = 5;

/** Single fill when the map sidebar has exactly one project after filters. */
const CHOROPLETH_SINGLE_FILTER_PROJECT_COLOR = "#3b82f6";

/** Fill for municipalities with no matching projects in the current map filter. */
const CHOROPLETH_ZERO_PROJECT_FILL = "#e5e7eb";

/** Must match `massachusetts-choropleth` paint so legend swatches match polygon appearance. */
const CHOROPLETH_FILL_OPACITY = 0.7;

/**
 * Approximate land color under town fills on Mapbox light-v11; legend stacks this under the
 * same fill opacity as the map so swatches align visually with the choropleth.
 */
const CHOROPLETH_LEGEND_UNDERLAY = "#ebebeb";

function sortedUniquePositiveCounts(counts) {
  const set = new Set();
  counts.forEach((c) => {
    if (typeof c === "number" && c > 0) set.add(c);
  });
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Spread rank 0..k-1 across the blue ramp (one row per distinct count when k ≤ 5).
 * Few levels stay on the lighter end: a single positive bucket uses mid blue, not navy.
 */
function denseChoroplethPaletteIndex(rank, k) {
  const maxIdx = CHOROPLETH_BUCKET_COLORS.length - 1;
  if (k <= 1) {
    return 2;
  }
  const paletteMax = k === 2 ? maxIdx - 1 : maxIdx;
  return Math.round((rank * paletteMax) / (k - 1));
}

function choroplethDenseFillColor(count, uniquePositiveSorted) {
  if (count <= 0 || !uniquePositiveSorted.length) {
    return CHOROPLETH_BUCKET_COLORS[0];
  }
  const rank = uniquePositiveSorted.indexOf(count);
  if (rank < 0) return CHOROPLETH_BUCKET_COLORS[0];
  const idx = denseChoroplethPaletteIndex(rank, uniquePositiveSorted.length);
  return CHOROPLETH_BUCKET_COLORS[idx];
}

/** Buckets use the real positive range: [minPositive, maxCount], inclusive. */
function countToChoroplethBucket(count, minPositive, maxCount) {
  if (count <= 0) return -1;
  if (maxCount <= 0 || minPositive == null) return -1;
  if (minPositive === maxCount) return 4;
  const t = (count - minPositive) / (maxCount - minPositive);
  return Math.min(4, Math.floor(t * 5));
}

function choroplethBucketFillColor(count, minPositive, maxCount) {
  const b = countToChoroplethBucket(count, minPositive, maxCount);
  if (b < 0) return CHOROPLETH_BUCKET_COLORS[0];
  return CHOROPLETH_BUCKET_COLORS[b];
}

/** Legend band labels from actual min/max positive counts (not a floor of 1). */
function formatChoroplethRangeForBucket(bucketIndex, minPositive, maxCount) {
  if (maxCount <= 0 || minPositive == null) return "—";
  if (minPositive === maxCount) {
    return bucketIndex === 4 ? String(minPositive) : "—";
  }
  const inBand = [];
  for (let c = minPositive; c <= maxCount; c += 1) {
    if (countToChoroplethBucket(c, minPositive, maxCount) === bucketIndex) {
      inBand.push(c);
    }
  }
  if (inBand.length === 0) return "—";
  const lo = inBand[0];
  const hi = inBand[inBand.length - 1];
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

function formatProjectsLegendTitle(range) {
  if (range === "—") return "—";
  if (range.includes("–")) return `${range} projects`;
  const n = parseInt(range, 10);
  if (n === 1) return "1 project";
  return `${range} projects`;
}

const MapComponent = ({
  /** Called with GeoJSON `town` name when user clicks a municipality polygon (non-year mode). */
  onMapTownClick = null,
  /** Municipality or subregion label from sidebar/map filter (may not match GeoJSON `town`). */
  mapFilterLabel,
  /** Town names to outline (e.g. Airtable subregion `munis`); resolved to GeoJSON keys in-map. */
  filterOutlineTownNames = [],
  viewMode = "city",
  selectedProject = null,
  onCityNotFound = null,
  choroplethData = null,
  selectedYear = null,
  onMunicipalityClick = null,
  isSidebarCollapsed = false,
  municipalityHoverProjectsByTown = {},
  onHoverProjectClick = null,
  shouldAutoZoomOnMapFilter = true,
  openTooltipForSidebarFilter = false,
  choroplethCountsByTown = null,
  /** When `1`, choropleth uses one positive color and a one-row legend (not 5 bands). */
  filteredMapProjectCount = null,
  /** Rows from `Municipalities and Municipal Coalitions` (see municipalityCollaborationSlice field map). */
  municipalityCollaborations = [],
}) => {
  const choroplethSingleFilterProject =
    typeof filteredMapProjectCount === "number" && filteredMapProjectCount === 1;
  const normalizeTownKey = (value) => {
    if (!value) return "";
    return String(value)
      .toUpperCase()
      .replace(/^CITY OF\s+/, "")
      .replace(/^TOWN OF\s+/, "")
      .replace(/[^A-Z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const [viewState, setViewState] = useState({
    longitude: -71.0589,
    latitude: 42.3601,
    zoom: 7,
  });

  const [geojsonData, setGeojsonData] = useState(null);
  const [mapcRegionData, setMapcRegionData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [clickedTooltipInfo, setClickedTooltipInfo] = useState(null);
  /** Town whose border is drawn red after a direct map polygon click (incl. subregion drill-down). */
  const [mapClickedOutlineTown, setMapClickedOutlineTown] = useState(null);
  const [isHoverTooltipActive, setIsHoverTooltipActive] = useState(false);
  const [showMapcRegionLayer, setShowMapcRegionLayer] = useState(true);
  const [popupInfo, setPopupInfo] = useState(null);
  const lastAlertedCities = useRef("");
  const mapRef = useRef(null);
  const hoverHideTimeoutRef = useRef(null);

  // Map will automatically resize when container width changes

  // Trigger map resize when sidebar collapses/expands
  useEffect(() => {
    if (mapRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        mapRef.current.getMap().resize();
      }, 100);
    }
  }, [isSidebarCollapsed]);

  // Handle window resize events
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        // Small delay to ensure DOM has updated
        setTimeout(() => {
          mapRef.current.getMap().resize();
        }, 100);
      }
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Trigger map resize when view mode changes
  useEffect(() => {
    if (mapRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        mapRef.current.getMap().resize();
      }, 200);
    }
  }, [viewMode]);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  /**
   * Subregions from Airtable `Municipalities and Municipal Coalitions`:
   * `isSubregion` (field `IsSubregion`), label `muni` (`Municipality`), member list `munis`.
   */
  const collaborationSubregions = useMemo(() => {
    const byUpperLabel = {};
    const allMunis = [];

    const rows = Array.isArray(municipalityCollaborations)
      ? municipalityCollaborations
      : [];

    rows.forEach((row) => {
      if (row?.isSubregion !== true) return;
      const label = typeof row?.muni === "string" ? row.muni.trim() : "";
      if (!label) return;
      const unique = normalizeCollaborationMunisField(row?.munis);
      byUpperLabel[label.toUpperCase()] = unique;
      unique.forEach((m) => allMunis.push(m));
    });

    return {
      byUpperLabel,
      allTownsFlat: [...new Set(allMunis)],
    };
  }, [municipalityCollaborations]);

  // Function to find the best matching town name from map data
  const findMatchingTown = (cityName) => {
    if (!geojsonData || !cityName) return null;

    const cityLower = cityName.toLowerCase().trim();

    // Skip matching for non-town entities (partnerships, regions, etc.)
    const skipPatterns = [
      "partnership",
      "region-wide",
      "district",
      "alliance",
      "consortium",
      "network",
      "495",
      "metro",
    ];

    // If the city name contains any of these patterns, don't try to match it to a town
    if (skipPatterns.some((pattern) => cityLower.includes(pattern))) {
      return null;
    }

    // First try exact match
    const exactMatch = geojsonData.features.find(
      (feature) =>
        feature.properties.town &&
        feature.properties.town.toLowerCase() === cityLower
    );
    if (exactMatch) return exactMatch.properties.town;

    // Try common variations (more specific matching)
    const variations = [
      cityName
        .replace(" City", "")
        .replace(" Town", "")
        .replace(" Village", ""),
      cityName + " City",
      cityName + " Town",
      cityName.replace("Cambridge", "Cambridge").replace("Boston", "Boston"),
    ];

    for (const variation of variations) {
      const match = geojsonData.features.find(
        (feature) =>
          feature.properties.town &&
          feature.properties.town.toLowerCase() === variation.toLowerCase()
      );
      if (match) return match.properties.town;
    }

    // Only try partial match for very specific cases (avoid false positives)
    // This should only match if the city name is a clear subset of the town name
    // or if the town name is a clear subset of the city name
    const partialMatch = geojsonData.features.find((feature) => {
      if (!feature.properties.town) return false;
      const townLower = feature.properties.town.toLowerCase();

      // Only match if one is clearly a subset of the other and they're similar in length
      const cityWords = cityLower.split(/\s+/);
      const townWords = townLower.split(/\s+/);

      // Very strict matching: only match if the shorter name is a complete word match
      // within the longer name, not just substring matching
      if (cityWords.length <= townWords.length) {
        return cityWords.every((cityWord) =>
          townWords.some(
            (townWord) =>
              townWord === cityWord || // Exact word match
              (cityWord.length > 3 && townWord.startsWith(cityWord)) // Prefix match for longer words
          )
        );
      } else {
        return townWords.every((townWord) =>
          cityWords.some(
            (cityWord) =>
              cityWord === townWord || // Exact word match
              (townWord.length > 3 && cityWord.startsWith(townWord)) // Prefix match for longer words
          )
        );
      }
    });
    if (partialMatch) return partialMatch.properties.town;

    return null;
  };

  // Subregion / region-wide labels vs collaboration slice (same as Sidebar `isSubregion` rows).
  const findMAPCSubregion = (cityName) => {
    if (!cityName) return null;

    const cityUpper = cityName.toUpperCase().trim();

    if (cityUpper === "MAPC REGION-WIDE" || cityUpper === "MAPC REGION WIDE") {
      return {
        type: "region-wide",
        name: "MAPC Region-wide",
        towns: collaborationSubregions.allTownsFlat,
      };
    }

    const towns = collaborationSubregions.byUpperLabel[cityUpper];
    if (towns && towns.length > 0) {
      return {
        type: "subregion",
        name: cityName.trim(),
        towns,
      };
    }

    return null;
  };

  // Get the matching town name for highlighting
  const matchingTown = mapFilterLabel ? findMatchingTown(mapFilterLabel) : null;

  // Resolved GeoJSON `town` names for filter-driven multi-muni highlight (e.g. subregion `munis`).
  const resolvedHighlightTownNames = useMemo(() => {
    if (!Array.isArray(filterOutlineTownNames) || filterOutlineTownNames.length === 0) {
      return [];
    }
    const towns = [];

    filterOutlineTownNames.forEach((city) => {
      if (!city || city.toLowerCase().includes("state-wide")) {
        return;
      }

      const subregion = findMAPCSubregion(city);
      if (subregion) {
        subregion.towns.forEach((raw) => {
          const resolved = findMatchingTown(raw);
          if (resolved) towns.push(resolved);
          else if (raw && geojsonData?.features?.length) {
            const t = String(raw).trim();
            const hit = geojsonData.features.find(
              (f) => f?.properties?.town === t
            );
            if (hit?.properties?.town) towns.push(hit.properties.town);
          }
        });
      } else {
        const town = findMatchingTown(city);
        if (town) towns.push(town);
      }
    });

    return [
      ...new Set(towns.map((t) => String(t).trim()).filter(Boolean)),
    ];
  }, [filterOutlineTownNames, geojsonData, collaborationSubregions]);

  // Subregion / multi-muni filter passes filterOutlineTownNames; skip "not found" alerts for that mode.
  useEffect(() => {
    if (filterOutlineTownNames.length > 0) {
      lastAlertedCities.current = "";
      return;
    }
    lastAlertedCities.current = "";
  }, [filterOutlineTownNames]);

  // Function to zoom to a specific town
  const zoomToTown = (townName) => {
    if (!geojsonData || !townName) return;

    const townFeature = geojsonData.features.find(
      (feature) => feature.properties.town === townName
    );

    if (townFeature) {
      // Extract coordinates safely based on geometry type
      let allCoordinates = [];

      if (townFeature.geometry.type === "Polygon") {
        // For Polygon, coordinates is an array of linear rings
        allCoordinates = townFeature.geometry.coordinates.flat();
      } else if (townFeature.geometry.type === "MultiPolygon") {
        // For MultiPolygon, coordinates is an array of polygons
        allCoordinates = townFeature.geometry.coordinates.flat(2);
      }

      if (allCoordinates.length === 0) return;

      // Calculate bounding box
      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;

      allCoordinates.forEach((coord) => {
        if (Array.isArray(coord) && coord.length >= 2) {
          const [lng, lat] = coord;
          if (
            typeof lng === "number" &&
            typeof lat === "number" &&
            !isNaN(lng) &&
            !isNaN(lat)
          ) {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          }
        }
      });

      // Validate that we have valid coordinates
      if (
        minLng === Infinity ||
        maxLng === -Infinity ||
        minLat === Infinity ||
        maxLat === -Infinity
      ) {
        console.warn("Invalid coordinates for town:", townName);
        return;
      }

      // Calculate center and zoom level
      const centerLng = (minLng + maxLng) / 2;
      const centerLat = (minLat + maxLat) / 2;

      // Validate center coordinates
      if (isNaN(centerLng) || isNaN(centerLat)) {
        console.warn("Invalid center coordinates for town:", townName);
        return;
      }

      // Bounding box size for the popup-aware fallback centering.
      const latDiff = maxLat - minLat;

      // Prefer fitBounds so the clicked polygon fills the viewport.
      // This fixes the "zooming out" look caused by using a fixed zoom level.
      // Also add extra top padding so the polygon stays visible above the popup.
      const map = mapRef.current?.getMap?.();
      if (map && typeof map.fitBounds === "function") {
        map.fitBounds(
          [
            [minLng, minLat], // SW
            [maxLng, maxLat], // NE
          ],
          {
            padding: { top: 180, bottom: 60, left: 40, right: 40 },
            duration: 1000,
            maxZoom: 16,
          }
        );
        return;
      }

      // Fallback: keep previous behavior if fitBounds isn't available.
      // Position the polygon at the top of the map by adjusting latitude.
      const adjustedLat = centerLat + latDiff * 0.5; // Move up so it's above the popup.

      setViewState({
        longitude: centerLng,
        latitude: adjustedLat,
        zoom: 8,
        transitionDuration: 1000,
        transitionInterpolator: {
          interpolatePosition: (from, to) => [from[0], from[1]],
        },
      });
    }
  };

  // Zoom to town when mapFilterLabel changes
  useEffect(() => {
    if (!shouldAutoZoomOnMapFilter) return;

    if (mapFilterLabel && mapFilterLabel.toLowerCase().includes("state-wide")) {
      // Zoom to show entire state
      setViewState({
        longitude: -71.0589,
        latitude: 42.3601,
        zoom: 6,
        transitionDuration: 1000,
        transitionInterpolator: {
          interpolatePosition: (from, to) => [from[0], from[1]],
        },
      });
    } else {
      // Check if mapFilterLabel is a MAPC subregion or region-wide
      const subregion = findMAPCSubregion(mapFilterLabel);
      if (subregion) {
        if (subregion.type === "region-wide") {
          // Zoom to show entire MAPC region
          setViewState({
            longitude: -71.0589,
            latitude: 42.3601,
            zoom: 6, // Zoom level appropriate for region-wide view
            transitionDuration: 1000,
            transitionInterpolator: {
              interpolatePosition: (from, to) => [from[0], from[1]],
            },
          });
        } else {
          // Zoom to show the entire subregion area
          setViewState({
            longitude: -71.0589,
            latitude: 42.3601,
            zoom: 7, // Zoom level appropriate for subregion view
            transitionDuration: 1000,
            transitionInterpolator: {
              interpolatePosition: (from, to) => [from[0], from[1]],
            },
          });
        }
      } else if (matchingTown) {
        // Individual town found
        zoomToTown(matchingTown);
      } else if (mapFilterLabel && onCityNotFound) {
        // When a subregion selection provides municipality highlights,
        // mapFilterLabel can be a label (e.g. "MetroWest") that is not a town name.
        // In that case, skip the not-found warning.
        if (Array.isArray(filterOutlineTownNames) && filterOutlineTownNames.length > 0) {
          return;
        }
        // City not found on map
        onCityNotFound(mapFilterLabel);
      }
    }
  }, [
    matchingTown,
    mapFilterLabel,
    onCityNotFound,
    shouldAutoZoomOnMapFilter,
    filterOutlineTownNames,
    municipalityCollaborations,
  ]);

  // When subregion municipalities are highlighted, zoom to their combined extent.
  useEffect(() => {
    if (!shouldAutoZoomOnMapFilter) return;
    if (
      !geojsonData ||
      !Array.isArray(filterOutlineTownNames) ||
      filterOutlineTownNames.length === 0
    )
      return;

    const highlightedTownNames = new Set(resolvedHighlightTownNames);
    if (highlightedTownNames.size === 0) return;

    const features = geojsonData.features.filter((feature) =>
      highlightedTownNames.has(String(feature?.properties?.town || "").trim())
    );
    if (features.length === 0) return;

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    const processCoordinates = (coords) => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === "number" && typeof coords[1] === "number") {
        const [lng, lat] = coords;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        return;
      }
      coords.forEach(processCoordinates);
    };

    features.forEach((feature) =>
      processCoordinates(feature?.geometry?.coordinates)
    );
    if (
      minLng === Infinity ||
      maxLng === -Infinity ||
      minLat === Infinity ||
      maxLat === -Infinity
    ) {
      return;
    }

    const map = mapRef.current?.getMap?.();
    if (map && typeof map.fitBounds === "function") {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: { top: 160, bottom: 60, left: 40, right: 40 },
          duration: 1000,
          maxZoom: 12,
        }
      );
    }
  }, [
    resolvedHighlightTownNames,
    geojsonData,
    shouldAutoZoomOnMapFilter,
  ]);

  // Open municipality tooltip when selected from dropdown filters.
  useEffect(() => {
    if (!openTooltipForSidebarFilter || !mapFilterLabel || !geojsonData) return;

    setMapClickedOutlineTown(null);

    const townName = matchingTown || findMatchingTown(mapFilterLabel);
    if (!townName) return;

    const feature = geojsonData.features.find(
      (item) => item?.properties?.town === townName
    );
    if (!feature) return;

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    const processCoordinates = (coords) => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === "number" && typeof coords[1] === "number") {
        const [lng, lat] = coords;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        return;
      }
      coords.forEach(processCoordinates);
    };

    processCoordinates(feature.geometry?.coordinates);
    if (
      minLng === Infinity ||
      maxLng === -Infinity ||
      minLat === Infinity ||
      maxLat === -Infinity
    ) {
      return;
    }

    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const updateTooltipPosition = () => {
      const map = mapRef.current?.getMap?.();
      if (!map || typeof map.project !== "function") return;

      const projected = map.project([centerLng, centerLat]);
      const tooltipPayload = {
        feature,
        x: projected.x,
        y: projected.y,
      };
      setClickedTooltipInfo(tooltipPayload);
      setHoverInfo(tooltipPayload);
    };

    // Set immediately for instant feedback...
    updateTooltipPosition();
    // ...and refresh after zoom animation so tooltip stays anchored.
    const timeoutId = setTimeout(updateTooltipPosition, 1100);
    return () => clearTimeout(timeoutId);
  }, [openTooltipForSidebarFilter, mapFilterLabel, matchingTown, geojsonData]);

  // When primary filter resets (mapFilterLabel cleared), clear map tooltip/hover windows.
  useEffect(() => {
    if (mapFilterLabel) return;
    setClickedTooltipInfo(null);
    setMapClickedOutlineTown(null);
    setHoverInfo(null);
    setIsHoverTooltipActive(false);
    setPopupInfo(null);
  }, [mapFilterLabel]);

  // Zoom to project's geographic focus extent when selectedProject changes
  useEffect(() => {
    if (
      selectedProject &&
      participatingMunicipalityTowns(selectedProject.allParticipatingMunicipalities)
        .length > 0 &&
      geojsonData
    ) {
      // Set map to center on the specified bounds
      const bounds = [
        [-74.0081481933594, 41.1863288879395],
        [-69.8615341186523, 42.8867149353027],
      ];

      // Calculate center from bounds
      const centerLng = (bounds[0][0] + bounds[1][0]) / 2;
      const centerLat = (bounds[0][1] + bounds[1][1]) / 2;

      // Set zoom level to 8 as requested
      setViewState({
        longitude: centerLng,
        latitude: centerLat,
        zoom: 8,
        transitionDuration: 1000,
        transitionInterpolator: {
          interpolatePosition: (from, to) => [from[0], from[1]],
        },
      });
    }
  }, [selectedProject, geojsonData]);

  // Load Massachusetts towns GeoJSON
  useEffect(() => {
    fetch("/data/Massachusetts.geojson")
      .then((response) => response.json())
      .then((data) => setGeojsonData(data))
      .catch((error) => console.error("Error loading GeoJSON:", error));
  }, []);

  const choroplethFromMerge = useMemo(() => {
    if (!geojsonData?.features || choroplethCountsByTown == null) return null;

    const resolveCount = (f) => {
      const town = f?.properties?.town;
      const keyCandidates = [
        town,
        town ? String(town).toUpperCase() : null,
        town ? normalizeTownKey(town) : null,
      ].filter(Boolean);

      for (let i = 0; i < keyCandidates.length; i += 1) {
        const k = keyCandidates[i];
        if (
          Object.prototype.hasOwnProperty.call(choroplethCountsByTown, k)
        ) {
          const v = choroplethCountsByTown[k];
          if (typeof v === "number") return v;
        }
      }
      return 0;
    };

    const counts = geojsonData.features.map(resolveCount);

    let minCount = Infinity;
    let maxCount = -Infinity;
    counts.forEach((c) => {
      if (c < minCount) minCount = c;
      if (c > maxCount) maxCount = c;
    });
    if (minCount === Infinity) minCount = 0;
    if (maxCount === -Infinity) maxCount = 0;

    let minPositive = Infinity;
    counts.forEach((c) => {
      if (c > 0 && c < minPositive) minPositive = c;
    });
    if (minPositive === Infinity) minPositive = null;

    const uniquePositiveSorted = sortedUniquePositiveCounts(counts);
    const choroplethScale =
      uniquePositiveSorted.length > CHOROPLETH_MAX_POSITIVE_BUCKETS
        ? "quintile"
        : "dense";

    const features = geojsonData.features.map((f, i) => ({
      ...f,
      properties: {
        ...f.properties,
        projectCount: counts[i],
        choroplethColor:
          choroplethSingleFilterProject && counts[i] > 0
            ? CHOROPLETH_SINGLE_FILTER_PROJECT_COLOR
            : choroplethScale === "dense"
              ? choroplethDenseFillColor(counts[i], uniquePositiveSorted)
              : choroplethBucketFillColor(counts[i], minPositive, maxCount),
      },
    }));

    return {
      featureCollection: { type: "FeatureCollection", features },
      minCount,
      maxCount,
      minPositive,
      choroplethScale,
      uniquePositiveSorted,
    };
  }, [geojsonData, choroplethCountsByTown, choroplethSingleFilterProject]);

  const mergedChoroplethFromCounts =
    choroplethFromMerge?.featureCollection ?? null;

  const sourceGeoJson =
    choroplethData || mergedChoroplethFromCounts || geojsonData;

  const showChoroplethFill = Boolean(
    (viewMode === "year" && choroplethData) || mergedChoroplethFromCounts
  );

  /** Keeps tooltip count in sync when filters change (avoids stale Mapbox feature props). */
  const clickTooltipLiveProjectCount = useMemo(() => {
    const town = clickedTooltipInfo?.feature?.properties?.town;
    if (!town) return undefined;

    if (mergedChoroplethFromCounts?.features?.length) {
      const hit = mergedChoroplethFromCounts.features.find(
        (ft) => ft?.properties?.town === town
      );
      if (
        hit?.properties &&
        typeof hit.properties.projectCount === "number"
      ) {
        return hit.properties.projectCount;
      }
    }

    const pc = clickedTooltipInfo.feature?.properties?.projectCount;
    return typeof pc === "number" ? pc : undefined;
  }, [clickedTooltipInfo, mergedChoroplethFromCounts]);

  const massachusettsInteractiveFilter = useMemo(() => {
    if (!showChoroplethFill) return ["has", "town"];
    if (mergedChoroplethFromCounts) return ["has", "town"];
    return [">", ["get", "projectCount"], 0];
  }, [showChoroplethFill, mergedChoroplethFromCounts]);

  const choroplethLegendExtent = useMemo(() => {
    if (!showChoroplethFill) return null;
    if (choroplethFromMerge) {
      return {
        minCount: choroplethFromMerge.minCount,
        maxCount: choroplethFromMerge.maxCount,
        minPositive: choroplethFromMerge.minPositive,
        choroplethScale: choroplethFromMerge.choroplethScale,
        uniquePositiveSorted: choroplethFromMerge.uniquePositiveSorted,
      };
    }
    const fc =
      choroplethData?.type === "FeatureCollection" &&
      Array.isArray(choroplethData?.features)
        ? choroplethData
        : null;
    if (!fc?.features?.length) {
      return {
        minCount: 0,
        maxCount: 0,
        minPositive: null,
        choroplethScale: "dense",
        uniquePositiveSorted: [],
      };
    }
    let minCount = Infinity;
    let maxCount = -Infinity;
    const allCounts = [];
    fc.features.forEach((f) => {
      const c = f?.properties?.projectCount;
      if (typeof c !== "number") return;
      allCounts.push(c);
      if (c < minCount) minCount = c;
      if (c > maxCount) maxCount = c;
    });
    if (minCount === Infinity) minCount = 0;
    if (maxCount === -Infinity) maxCount = 0;
    let minPositive = Infinity;
    fc.features.forEach((f) => {
      const c = f?.properties?.projectCount;
      if (typeof c === "number" && c > 0 && c < minPositive) minPositive = c;
    });
    if (minPositive === Infinity) minPositive = null;
    const uniquePositiveSorted = sortedUniquePositiveCounts(allCounts);
    const choroplethScale =
      uniquePositiveSorted.length > CHOROPLETH_MAX_POSITIVE_BUCKETS
        ? "quintile"
        : "dense";
    return {
      minCount,
      maxCount,
      minPositive,
      choroplethScale,
      uniquePositiveSorted,
    };
  }, [showChoroplethFill, choroplethFromMerge, choroplethData]);

  const choroplethLegendRows = useMemo(() => {
    if (choroplethLegendExtent === null) return [];
    const {
      maxCount,
      minPositive,
      choroplethScale = "quintile",
      uniquePositiveSorted = [],
    } = choroplethLegendExtent;
    const rows = [
      {
        key: "none",
        swatchColor: CHOROPLETH_ZERO_PROJECT_FILL,
        title: "0 projects",
        subtitle: "",
      },
    ];
    if (maxCount <= 0 || minPositive == null) {
      return rows;
    }
    if (choroplethSingleFilterProject) {
      const range =
        minPositive === maxCount
          ? String(minPositive)
          : `${minPositive}–${maxCount}`;
      rows.push({
        key: "bucket-single-filter",
        swatchColor: CHOROPLETH_SINGLE_FILTER_PROJECT_COLOR,
        title: formatProjectsLegendTitle(range),
        subtitle: "One project in sidebar filter",
      });
      return rows;
    }
    if (
      choroplethScale === "dense" &&
      uniquePositiveSorted.length > 0 &&
      uniquePositiveSorted.length <= CHOROPLETH_MAX_POSITIVE_BUCKETS
    ) {
      const k = uniquePositiveSorted.length;
      uniquePositiveSorted.forEach((n, i) => {
        const paletteIdx = denseChoroplethPaletteIndex(i, k);
        rows.push({
          key: `dense-${n}`,
          swatchColor: CHOROPLETH_BUCKET_COLORS[paletteIdx],
          title: formatProjectsLegendTitle(String(n)),
          subtitle: null,
        });
      });
      return rows;
    }
    for (let b = 0; b < 5; b += 1) {
      const range = formatChoroplethRangeForBucket(b, minPositive, maxCount);
      if (range === "—") continue;
      rows.push({
        key: `bucket-${b}`,
        swatchColor: CHOROPLETH_BUCKET_COLORS[b],
        title: formatProjectsLegendTitle(range),
        subtitle: null,
      });
    }
    return rows;
  }, [choroplethLegendExtent, choroplethSingleFilterProject]);

  const choroplethLegendAriaLabel = useMemo(() => {
    if (choroplethLegendExtent === null) return "";
    const { minCount, maxCount } = choroplethLegendExtent;
    return `Municipality project counts min ${minCount} max ${maxCount}. ${choroplethLegendRows
      .map((r) => (r.subtitle ? `${r.title}, ${r.subtitle}` : r.title))
      .join(". ")}`;
  }, [choroplethLegendRows, choroplethLegendExtent]);

  // Load MAPC region outline from ArcGIS REST as GeoJSON.
  useEffect(() => {
    fetch(
      "https://services.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/MAPC_Outline_(single_polygon)/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson"
    )
      .then((response) => response.json())
      .then((data) => setMapcRegionData(data))
      .catch((error) =>
        console.error("Error loading MAPC region GeoJSON:", error)
      );
  }, []);

  const onHover = (event) => {
    if (hoverHideTimeoutRef.current) {
      clearTimeout(hoverHideTimeoutRef.current);
      hoverHideTimeoutRef.current = null;
    }

    const {
      features,
      point: { x, y },
    } = event;
    const hoveredFeature = features && features[0];
    if (
      hoveredFeature &&
      hoveredFeature.properties &&
      hoveredFeature.properties.town
    ) {
      setHoverInfo({
        feature: hoveredFeature,
        x,
        y,
      });
    } else {
      // Delay hide slightly so users can move into tooltip links.
      hoverHideTimeoutRef.current = setTimeout(() => {
        if (!isHoverTooltipActive) {
          setHoverInfo(null);
        }
      }, 120);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverHideTimeoutRef.current) {
        clearTimeout(hoverHideTimeoutRef.current);
      }
    };
  }, []);

  const handleMapMouseLeave = () => {
    // When moving from the map into the sidebar, `onMouseMove` may stop firing.
    // Clear the hover tooltip immediately so it doesn't linger under the header.
    if (hoverHideTimeoutRef.current) {
      clearTimeout(hoverHideTimeoutRef.current);
      hoverHideTimeoutRef.current = null;
    }
    setHoverInfo(null);
    setIsHoverTooltipActive(false);
  };

  const handleMapClick = (event) => {
    const { features, point } = event;
    const clickedFeature = features && features[0];
    if (
      clickedFeature &&
      clickedFeature.properties &&
      clickedFeature.properties.town
    ) {
      setClickedTooltipInfo({
        feature: clickedFeature,
        x: point.x,
        y: point.y,
      });
      setMapClickedOutlineTown(clickedFeature.properties.town);
      if (viewMode === "year" && onMunicipalityClick) {
        // In year view, only allow clicking on municipalities with projects
        if (clickedFeature.properties.projectCount > 0) {
          onMunicipalityClick(clickedFeature.properties.town);
        }
      } else if (onMapTownClick) {
        // Keep subregion municipalities highlighted when user clicks a town.
        // Subregion mode passes filterOutlineTownNames (munis) from Sidebar selection.
        if (Array.isArray(filterOutlineTownNames) && filterOutlineTownNames.length > 0) {
          return;
        }
        onMapTownClick(clickedFeature.properties.town);
      }
    } else {
      setClickedTooltipInfo(null);
      setMapClickedOutlineTown(null);
      setHoverInfo(null);
      setIsHoverTooltipActive(false);
    }
  };

  const cursor = hoverInfo ? "pointer" : "default";

  const clickTooltipPosition = useMemo(() => {
    if (!clickedTooltipInfo) return null;
    const { x, y } = clickedTooltipInfo;
    const ESTIMATED_MAX_HEIGHT = 340;
    const TOP_MARGIN = 16;
    const flipBelow = y < ESTIMATED_MAX_HEIGHT + TOP_MARGIN;
    if (flipBelow) {
      return {
        left: x + 10,
        top: y + 14,
        transform: "translateX(-50%)",
      };
    }
    return {
      left: x + 10,
      top: y - 10,
      transform: "translate(-50%, -100%)",
    };
  }, [clickedTooltipInfo]);

  const hoverTooltipPosition = useMemo(() => {
    if (!hoverInfo?.feature?.properties?.town) return null;
    const { x, y } = hoverInfo;
    const flipBelow = y < 32;
    if (flipBelow) {
      return {
        left: x + 8,
        top: y + 10,
        transform: "none",
      };
    }
    return {
      left: x + 8,
      top: y - 8,
      transform: "translateY(-100%)",
    };
  }, [hoverInfo]);

  return (
    <div className="w-full h-full relative" onMouseLeave={handleMapMouseLeave}>
      {/* Toggle switch for MAPC region outline */}
      <div className="absolute top-25 right-2 z-20 bg-white rounded shadow px-2 py-1 flex items-center space-x-2">
        <label
          htmlFor="subregion-toggle"
          className="text-sm font-small text-gray-700"
        >
          Show MAPC Region
        </label>
        <input
          id="subregion-toggle"
          type="checkbox"
          checked={showMapcRegionLayer}
          onChange={() => setShowMapcRegionLayer((v) => !v)}
          className="accent-gray-500 w-5 h-5"
        />
      </div>
      {showChoroplethFill && choroplethLegendExtent !== null && (
        <div
          className="pointer-events-none absolute bottom-5 right-3 z-20 w-[240px] max-w-[calc(100%-1.5rem)] rounded-lg border border-gray-200 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur-sm"
          role="img"
          aria-label={choroplethLegendAriaLabel}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">
            Project count by municipality
          </div>
          <ul className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
            {choroplethLegendRows.map((row) => (
              <li key={row.key} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 h-4 w-4 shrink-0 overflow-hidden rounded border border-gray-300 shadow-sm ${
                    row.swatchColor ? "relative" : ""
                  }`}
                  style={
                    row.swatchColor
                      ? undefined
                      : {
                          backgroundColor: "transparent",
                          backgroundImage:
                            "repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 2px, #ffffff 2px, #ffffff 4px)",
                        }
                  }
                >
                  {row.swatchColor ? (
                    <>
                      <span
                        className="absolute inset-0"
                        style={{ backgroundColor: CHOROPLETH_LEGEND_UNDERLAY }}
                        aria-hidden
                      />
                      <span
                        className="absolute inset-0"
                        style={{
                          backgroundColor: row.swatchColor,
                          opacity: CHOROPLETH_FILL_OPACITY,
                        }}
                        aria-hidden
                      />
                    </>
                  ) : null}
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[11px] font-medium text-gray-900">
                    {row.title}
                  </div>
                  {row.subtitle ? (
                    <div className="text-[10px] text-gray-500">{row.subtitle}</div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={
          showChoroplethFill
            ? ["massachusetts-choropleth", "massachusetts-interactive"]
            : ["massachusetts-interactive"]
        }
        onMouseMove={onHover}
        onClick={handleMapClick}
        cursor={cursor}
        ref={mapRef}
      >
        <NavigationControl position="top-right" />
        {/* MAPC region outline (no fill) */}
        {showMapcRegionLayer && mapcRegionData && (
          <Source id="mapc-region-outline" type="geojson" data={mapcRegionData}>
            <Layer
              id="mapc-region-outline-line"
              type="line"
              paint={{
                "line-color": "#f59e42",
                "line-width": 2.5,
              }}
            />
          </Source>
        )}
        {/* Massachusetts Towns Layer */}
        {geojsonData && (
          <Source
            id="massachusetts"
            type="geojson"
            data={sourceGeoJson}
          >
            {showChoroplethFill && (
              <Layer
                id="massachusetts-choropleth"
                type="fill"
                paint={{
                  "fill-color": [
                    "case",
                    ["==", ["get", "projectCount"], 0],
                    CHOROPLETH_ZERO_PROJECT_FILL,
                    ["get", "choroplethColor"],
                  ],
                  "fill-opacity": CHOROPLETH_FILL_OPACITY,
                }}
                filter={["has", "town"]}
              />
            )}
            {/* Transparent fill layer for interaction */}
            <Layer
              id="massachusetts-interactive"
              type="fill"
              paint={{
                "fill-color": "#000",
                "fill-opacity": 0,
              }}
              filter={massachusettsInteractiveFilter}
            />
            {/* Fill highlight only while hovering; selection uses outline layer (no fill) */}
            <Layer
              key={`hover-highlight-${viewMode}-${showChoroplethFill ? "ch" : "plain"}`}
              id="massachusetts-highlight"
              type="fill"
              paint={{
                "fill-color": showChoroplethFill
                  ? "#f59e0b"
                  : viewMode === "geographicCount"
                    ? "#86efac"
                    : "#3b82f6",
                "fill-opacity": showChoroplethFill ? 0.52 : 0.5,
              }}
              filter={
                hoverInfo &&
                hoverInfo.feature &&
                hoverInfo.feature.properties &&
                hoverInfo.feature.properties.town
                  ? ["==", "town", hoverInfo.feature.properties.town]
                  : ["==", "town", ""]
              }
            />
            {/* Base line layer with green borders */}
            <Layer
              id="massachusetts-line"
              type="line"
              paint={{
                "line-color": "#6fc68e",
                "line-width": 1,
              }}
            />
            {resolvedHighlightTownNames.length > 0 && (
              <Layer
                id="massachusetts-filter-highlight-outline"
                type="line"
                paint={{
                  "line-color": "#dc2626",
                  "line-width": 2.75,
                  "line-opacity": 0.95,
                }}
                filter={[
                  "in",
                  ["get", "town"],
                  ["literal", resolvedHighlightTownNames],
                ]}
              />
            )}
            {mapClickedOutlineTown && (
              <Layer
                key={`map-click-outline-${mapClickedOutlineTown}`}
                id="massachusetts-map-click-outline"
                type="line"
                paint={{
                  "line-color": "#dc2626",
                  "line-width": 3.5,
                  "line-opacity": 1,
                }}
                filter={[
                  "in",
                  ["get", "town"],
                  ["literal", [mapClickedOutlineTown]],
                ]}
              />
            )}
          </Source>
        )}
        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div>
              <h3>{popupInfo.name}</h3>
              <p>{popupInfo.description}</p>
            </div>
          </Popup>
        )}
      </Map>
      {/* Tooltips live outside <Map> so React re-renders them when filter props change
          (react-map-gl does not reliably reconcile arbitrary DOM children inside Map). */}
      {!clickedTooltipInfo &&
        hoverInfo &&
        hoverInfo.feature?.properties?.town &&
        hoverTooltipPosition && (
          <div
            className="pointer-events-none absolute z-[1080] rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow"
            style={hoverTooltipPosition}
          >
            {hoverInfo.feature.properties.town}
          </div>
        )}
      {clickedTooltipInfo && clickTooltipPosition && (
        <div
          className="pointer-events-auto absolute z-[1080] w-[360px] max-w-[90vw] rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xl"
          style={clickTooltipPosition}
        >
          <div className="p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="text-sm font-semibold tracking-wide text-gray-900">
                {clickedTooltipInfo.feature.properties.town}
              </div>
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setClickedTooltipInfo(null);
                  setMapClickedOutlineTown(null);
                  setHoverInfo(null);
                  setIsHoverTooltipActive(false);
                }}
              >
                Close
              </button>
            </div>
            {typeof clickTooltipLiveProjectCount === "number" && (
              <div className="mt-1 text-xs text-gray-500">
                {clickTooltipLiveProjectCount} project
                {clickTooltipLiveProjectCount !== 1 ? "s" : ""}
                {viewMode === "year" && selectedYear
                  ? ` (${selectedYear})`
                  : showChoroplethFill
                    ? " (current filters)"
                    : ""}
              </div>
            )}
            {(() => {
              const town = clickedTooltipInfo?.feature?.properties?.town;
              if (!town) return null;
              const recentProjects =
                municipalityHoverProjectsByTown[town.toUpperCase()] ||
                municipalityHoverProjectsByTown[normalizeTownKey(town)] ||
                [];
              if (recentProjects.length === 0) return null;

              const byYear = {};
              recentProjects.forEach((item) => {
                const yKey =
                  item.year == null || Number.isNaN(item.year)
                    ? "_none"
                    : String(item.year);
                if (!byYear[yKey]) byYear[yKey] = [];
                byYear[yKey].push(item);
              });
              Object.keys(byYear).forEach((k) => {
                byYear[k].sort((a, b) =>
                  (a.name || "").localeCompare(b.name || "", undefined, {
                    sensitivity: "base",
                  })
                );
              });
              const yearSections = [];
              const numericYears = Object.keys(byYear)
                .filter((k) => k !== "_none")
                .map((k) => parseInt(k, 10))
                .filter((n) => !Number.isNaN(n))
                .sort((a, b) => b - a);
              numericYears.forEach((y) => {
                yearSections.push({
                  key: `y-${y}`,
                  yearLabel: String(y),
                  items: byYear[String(y)],
                });
              });
              if (byYear._none?.length) {
                yearSections.push({
                  key: "y-none",
                  yearLabel: "No year",
                  items: byYear._none,
                });
              }

              return (
                <div className="mt-3 border-t border-gray-200 pt-2">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Projects by year
                  </div>
                  <div className="max-h-44 space-y-3 overflow-y-auto pr-1">
                    {yearSections.map((section) => (
                      <div key={`${town}-${section.key}`}>
                        <div className="mb-1 text-xs font-bold text-gray-800">
                          {section.yearLabel}
                        </div>
                        <div className="space-y-0.5 border-l-2 border-gray-200 pl-2">
                          {section.items.map((item) => (
                            <button
                              key={`${town}-${section.key}-${item.id}`}
                              type="button"
                              className="block w-full rounded px-1.5 py-0.5 text-left text-xs leading-snug text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onHoverProjectClick)
                                  onHoverProjectClick(item.project);
                              }}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {(() => {
              const town = clickedTooltipInfo?.feature?.properties?.town;
              if (!town) return null;
              const recentProjects =
                municipalityHoverProjectsByTown[town.toUpperCase()] ||
                municipalityHoverProjectsByTown[normalizeTownKey(town)] ||
                [];
              if (recentProjects.length > 0) return null;
              return (
                <div className="mt-2 text-xs text-gray-500">
                  No projects for this municipality match the current filters.
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
