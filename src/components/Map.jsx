import { useState, useEffect, useRef, useMemo } from 'react'
import { Map, NavigationControl, Source, Layer, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapComponent = ({ 
  data = [], 
  onCitySelect, 
  selectedCity, 
  highlightedCities = [], 
  cityColors = {}, 
  viewMode = 'city', 
  selectedProject = null, 
  onCityNotFound = null,
  choroplethData = null,
  selectedYear = null,
  onMunicipalityClick = null,
  isSidebarCollapsed = false,
  municipalityHoverProjectsByTown = {},
  onHoverProjectClick = null,
  shouldAutoZoomOnSelectedCity = true,
  openTooltipForSelectedCity = false
}) => {
  const normalizeTownKey = (value) => {
    if (!value) return ''
    return String(value)
      .toUpperCase()
      .replace(/^CITY OF\s+/, '')
      .replace(/^TOWN OF\s+/, '')
      .replace(/[^A-Z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const [viewState, setViewState] = useState({
    longitude: -71.0589,
    latitude: 42.3601,
    zoom: 7
  });

  const [geojsonData, setGeojsonData] = useState(null);
  const [mapcRegionData, setMapcRegionData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [clickedTooltipInfo, setClickedTooltipInfo] = useState(null);
  const [isHoverTooltipActive, setIsHoverTooltipActive] = useState(false);
  const [showMapcRegionLayer, setShowMapcRegionLayer] = useState(true);
  const [popupInfo, setPopupInfo] = useState(null);
  const lastAlertedCities = useRef('');
  const mapRef = useRef(null);
  const hoverHideTimeoutRef = useRef(null);

  // Map will automatically resize when container width changes

  // Trigger map resize when sidebar collapses/expands
  useEffect(() => {
    if (mapRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        mapRef.current.getMap().resize();
        console.log('Map resized due to sidebar state change');
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
          console.log('Map resized due to window resize');
        }, 100);
      }
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Trigger map resize when view mode changes
  useEffect(() => {
    if (mapRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        mapRef.current.getMap().resize();
        console.log('Map resized due to view mode change');
      }, 200);
    }
  }, [viewMode]);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

  // MAPC Subregion mapping
  const MAPC_SUBREGIONS = {
    'MAGIC': ['ACTON', 'ARLINGTON', 'BEDFORD', 'BOLTON', 'BOXBOROUGH', 'CARLISLE', 'CONCORD', 'HUDSON', 'LEXINGTON', 'LINCOLN', 'LITTLETON', 'MAYNARD', 'STOW', 'SUDBURY'],
    'ICC': ['BOSTON', 'BROOKLINE', 'CAMBRIDGE', 'CHELSEA', 'EVERETT', 'LYNN', 'MALDEN', 'MEDFORD', 'MELROSE', 'NEWTON', 'QUINCY', 'REVERE', 'SAUGUS', 'SOMERVILLE', 'WALTHAM', 'WATERTOWN', 'WINTHROP'],
    'MWRC': ['ASHLAND', 'FRAMINGHAM', 'HOLLISTON', 'MARLBOROUGH', 'NATICK', 'SHERBORN', 'SOUTHBOROUGH', 'WAYLAND', 'WELLESLEY', 'WESTON'],
    'SWAP': ['BELLINGHAM', 'DOVER', 'FRANKLIN', 'HOPKINTON', 'MEDWAY', 'MILFORD', 'MILLIS', 'NORFOLK', 'WRENTHAM'],
    'NSTF': ['BEVERLY', 'DANVERS', 'ESSEX', 'GLOUCESTER', 'HAMILTON', 'IPSWICH', 'LYNNFIELD', 'MANCHESTER-BY-THE-SEA', 'MARBLEHEAD', 'MIDDLETON', 'NAHANT', 'PEABODY', 'ROCKPORT', 'SALEM', 'SWAMPSCOTT', 'TOPSFIELD', 'WENHAM'],
    'SSC': ['BRAINTREE', 'COHASSET', 'DUXBURY', 'HANOVER', 'HINGHAM', 'HOLBROOK', 'HULL', 'MARSHFIELD', 'NORWELL', 'PEMBROKE', 'ROCKLAND', 'SCITUATE', 'WEYMOUTH'],
    'TRIC': ['CANTON', 'DEDHAM', 'FOXBOROUGH', 'MEDFIELD', 'MILTON', 'NEEDHAM', 'NORWOOD', 'RANDOLPH', 'SHARON', 'STOUGHTON', 'WALPOLE', 'WESTWOOD'],
    'NSPC': ['BURLINGTON', 'LYNNFIELD', 'NORTH READING', 'READING', 'STONEHAM', 'WAKEFIELD', 'WILMINGTON', 'WINCHESTER', 'WOBURN']
  }

  // Function to find the best matching town name from map data
  const findMatchingTown = (cityName) => {
    if (!geojsonData || !cityName) return null
    
    const cityLower = cityName.toLowerCase().trim()
    
    // Skip matching for non-town entities (partnerships, regions, etc.)
    const skipPatterns = [
      'partnership', 'region-wide', 'district', 'alliance', 'consortium', 'network',
      '495', 'metro'
    ]
    
    // If the city name contains any of these patterns, don't try to match it to a town
    if (skipPatterns.some(pattern => cityLower.includes(pattern))) {
      return null
    }
    
    // First try exact match
    const exactMatch = geojsonData.features.find(feature => 
      feature.properties.town && 
      feature.properties.town.toLowerCase() === cityLower
    )
    if (exactMatch) return exactMatch.properties.town
    
    // Try common variations (more specific matching)
    const variations = [
      cityName.replace(' City', '').replace(' Town', '').replace(' Village', ''),
      cityName + ' City',
      cityName + ' Town',
      cityName.replace('Cambridge', 'Cambridge').replace('Boston', 'Boston')
    ]
    
    for (const variation of variations) {
      const match = geojsonData.features.find(feature => 
        feature.properties.town && 
        feature.properties.town.toLowerCase() === variation.toLowerCase()
      )
      if (match) return match.properties.town
    }
    
    // Only try partial match for very specific cases (avoid false positives)
    // This should only match if the city name is a clear subset of the town name
    // or if the town name is a clear subset of the city name
    const partialMatch = geojsonData.features.find(feature => {
      if (!feature.properties.town) return false
      const townLower = feature.properties.town.toLowerCase()
      
      // Only match if one is clearly a subset of the other and they're similar in length
      const cityWords = cityLower.split(/\s+/)
      const townWords = townLower.split(/\s+/)
      
      // Very strict matching: only match if the shorter name is a complete word match
      // within the longer name, not just substring matching
      if (cityWords.length <= townWords.length) {
        return cityWords.every(cityWord => 
          townWords.some(townWord => 
            townWord === cityWord || // Exact word match
            (cityWord.length > 3 && townWord.startsWith(cityWord)) // Prefix match for longer words
          )
        )
      } else {
        return townWords.every(townWord => 
          cityWords.some(cityWord => 
            cityWord === townWord || // Exact word match
            (townWord.length > 3 && cityWord.startsWith(townWord)) // Prefix match for longer words
          )
        )
      }
    })
    if (partialMatch) return partialMatch.properties.town
    
    return null
  }

  // Function to find MAPC subregion and return all towns in that subregion
  const findMAPCSubregion = (cityName) => {
    if (!cityName) return null
    
    const cityUpper = cityName.toUpperCase().trim()
    
    // Special handling for MAPC Region-wide
    if (cityUpper === 'MAPC REGION-WIDE' || cityUpper === 'MAPC REGION WIDE') {
      // Return all towns from all subregions
      const allTowns = Object.values(MAPC_SUBREGIONS).flat()
      return {
        type: 'region-wide',
        name: 'MAPC Region-wide',
        towns: allTowns
      }
    }
    
    // Check if the city name matches any MAPC subregion
    if (MAPC_SUBREGIONS[cityUpper]) {
      return {
        type: 'subregion',
        name: cityUpper,
        towns: MAPC_SUBREGIONS[cityUpper]
      }
    }
    
    return null
  }

  // Get the matching town name for highlighting
  const matchingTown = selectedCity ? findMatchingTown(selectedCity) : null

  // Get matching town names for highlighted cities
  const matchingHighlightedTowns = highlightedCities.map(city => {
    // Special handling for State-Wide
    if (city.toLowerCase().includes('state-wide')) {
      return 'STATE_WIDE_SPECIAL' // Special marker for state-wide
    }
    
    // First try to find as MAPC subregion
    const subregion = findMAPCSubregion(city)
    if (subregion) {
      return `SUBREGION_${subregion.name}` // Special marker for subregion
    }
    
    // Then try to find as individual town
    return findMatchingTown(city)
  }).filter(Boolean)

  // Get all towns that should be highlighted (including subregion towns)
  const getAllHighlightedTowns = () => {
    const towns = []
    
    highlightedCities.forEach(city => {
      if (city.toLowerCase().includes('state-wide')) {
        // For state-wide, we'll handle this specially in the filter
        return
      }
      
      const subregion = findMAPCSubregion(city)
      if (subregion) {
        // Add all towns in this subregion (or all towns if region-wide)
        towns.push(...subregion.towns)
      } else {
        // Add individual town
        const town = findMatchingTown(city)
        if (town) {
          towns.push(town)
        }
      }
    })
    
    return towns
  }

  // Check if any cities couldn't be found and trigger alert
  useEffect(() => {
    // Subregion mode uses highlightedCities to represent munis from a selected subregion.
    // We intentionally suppress "not found" alerts for this mode.
    if (highlightedCities.length > 0) {
      lastAlertedCities.current = ''
      return
    }

    if (highlightedCities.length > 0 && onCityNotFound) {
      // Check for cities that couldn't be found (not state-wide, not a subregion, not region-wide, not an individual town)
      const notFoundCities = highlightedCities.filter(city => {
        if (city.toLowerCase().includes('state-wide')) {
          return false // State-wide is always valid
        }
        
        const subregion = findMAPCSubregion(city)
        if (subregion) {
          return false // Subregion or region-wide is valid
        }
        
        const town = findMatchingTown(city)
        return !town // Individual town not found
      })
      
      if (notFoundCities.length > 0) {
        const notFoundCitiesString = notFoundCities.join(', ')
        // Only show alert if we haven't already alerted for these exact cities
        if (lastAlertedCities.current !== notFoundCitiesString) {
          lastAlertedCities.current = notFoundCitiesString
          onCityNotFound(notFoundCitiesString)
        }
      }
    } else if (highlightedCities.length === 0) {
      // Reset the ref when there are no highlighted cities
      lastAlertedCities.current = ''
    }
  }, [highlightedCities, onCityNotFound]) // Added onCityNotFound back but will use useCallback in parent

  // Function to zoom to a specific town
  const zoomToTown = (townName) => {
    if (!geojsonData || !townName) return
    
    const townFeature = geojsonData.features.find(feature => 
      feature.properties.town === townName
    )
    
    if (townFeature) {
      // Extract coordinates safely based on geometry type
      let allCoordinates = []
      
      if (townFeature.geometry.type === 'Polygon') {
        // For Polygon, coordinates is an array of linear rings
        allCoordinates = townFeature.geometry.coordinates.flat()
      } else if (townFeature.geometry.type === 'MultiPolygon') {
        // For MultiPolygon, coordinates is an array of polygons
        allCoordinates = townFeature.geometry.coordinates.flat(2)
      }
      
      if (allCoordinates.length === 0) return
      
      // Calculate bounding box
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
      
      allCoordinates.forEach(coord => {
        if (Array.isArray(coord) && coord.length >= 2) {
          const [lng, lat] = coord
          if (typeof lng === 'number' && typeof lat === 'number' && 
              !isNaN(lng) && !isNaN(lat)) {
            minLng = Math.min(minLng, lng)
            maxLng = Math.max(maxLng, lng)
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
          }
        }
      })
      
      // Validate that we have valid coordinates
      if (minLng === Infinity || maxLng === -Infinity || 
          minLat === Infinity || maxLat === -Infinity) {
        console.warn('Invalid coordinates for town:', townName)
        return
      }
      
      // Calculate center and zoom level
      const centerLng = (minLng + maxLng) / 2
      const centerLat = (minLat + maxLat) / 2
      
      // Validate center coordinates
      if (isNaN(centerLng) || isNaN(centerLat)) {
        console.warn('Invalid center coordinates for town:', townName)
        return
      }
      
      // Bounding box size for the popup-aware fallback centering.
      const latDiff = maxLat - minLat

      // Prefer fitBounds so the clicked polygon fills the viewport.
      // This fixes the "zooming out" look caused by using a fixed zoom level.
      // Also add extra top padding so the polygon stays visible above the popup.
      const map = mapRef.current?.getMap?.()
      if (map && typeof map.fitBounds === 'function') {
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
        )
        return
      }

      // Fallback: keep previous behavior if fitBounds isn't available.
      // Position the polygon at the top of the map by adjusting latitude.
      const adjustedLat = centerLat + latDiff * 0.5 // Move up so it's above the popup.

      setViewState({
        longitude: centerLng,
        latitude: adjustedLat,
        zoom: 8,
        transitionDuration: 1000,
        transitionInterpolator: {
          interpolatePosition: (from, to) => [from[0], from[1]]
        }
      })
    }
  }

  // Zoom to town when selectedCity changes
  useEffect(() => {
    if (!shouldAutoZoomOnSelectedCity) return

    if (selectedCity && selectedCity.toLowerCase().includes('state-wide')) {
      // Zoom to show entire state
      setViewState({
        longitude: -71.0589,
        latitude: 42.3601,
        zoom: 6,
        transitionDuration: 1000,
        transitionInterpolator: {
          interpolatePosition: (from, to) => [from[0], from[1]]
        }
      })
    } else {
      // Check if selectedCity is a MAPC subregion or region-wide
      const subregion = findMAPCSubregion(selectedCity)
      if (subregion) {
        if (subregion.type === 'region-wide') {
          // Zoom to show entire MAPC region
          setViewState({
            longitude: -71.0589,
            latitude: 42.3601,
            zoom: 6, // Zoom level appropriate for region-wide view
            transitionDuration: 1000,
            transitionInterpolator: {
              interpolatePosition: (from, to) => [from[0], from[1]]
            }
          })
        } else {
          // Zoom to show the entire subregion area
          setViewState({
            longitude: -71.0589,
            latitude: 42.3601,
            zoom: 7, // Zoom level appropriate for subregion view
            transitionDuration: 1000,
            transitionInterpolator: {
              interpolatePosition: (from, to) => [from[0], from[1]]
            }
          })
        }
      } else if (matchingTown) {
        // Individual town found
        zoomToTown(matchingTown)
      } else if (selectedCity && onCityNotFound) {
        // When a subregion selection provides municipality highlights,
        // selectedCity can be a label (e.g. "MetroWest") that is not a town name.
        // In that case, skip the not-found warning.
        if (Array.isArray(highlightedCities) && highlightedCities.length > 0) {
          return
        }
        // City not found on map
        onCityNotFound(selectedCity)
      }
    }
  }, [matchingTown, selectedCity, onCityNotFound, shouldAutoZoomOnSelectedCity, highlightedCities])

  // When subregion municipalities are highlighted, zoom to their combined extent.
  useEffect(() => {
    if (!shouldAutoZoomOnSelectedCity) return
    if (!geojsonData || !Array.isArray(highlightedCities) || highlightedCities.length === 0) return

    const highlightedTownNames = new Set(
      getAllHighlightedTowns()
        .map((town) => String(town).trim())
        .filter(Boolean)
    )
    if (highlightedTownNames.size === 0) return

    const features = geojsonData.features.filter((feature) =>
      highlightedTownNames.has(String(feature?.properties?.town || '').trim())
    )
    if (features.length === 0) return

    let minLng = Infinity
    let maxLng = -Infinity
    let minLat = Infinity
    let maxLat = -Infinity

    const processCoordinates = (coords) => {
      if (!Array.isArray(coords)) return
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        const [lng, lat] = coords
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        return
      }
      coords.forEach(processCoordinates)
    }

    features.forEach((feature) => processCoordinates(feature?.geometry?.coordinates))
    if (
      minLng === Infinity ||
      maxLng === -Infinity ||
      minLat === Infinity ||
      maxLat === -Infinity
    ) {
      return
    }

    const map = mapRef.current?.getMap?.()
    if (map && typeof map.fitBounds === 'function') {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        {
          padding: { top: 160, bottom: 60, left: 40, right: 40 },
          duration: 1000,
          maxZoom: 12
        }
      )
    }
  }, [highlightedCities, geojsonData, shouldAutoZoomOnSelectedCity])

  // Open municipality tooltip when selected from dropdown filters.
  useEffect(() => {
    if (!openTooltipForSelectedCity || !selectedCity || !geojsonData) return

    const townName = matchingTown || findMatchingTown(selectedCity)
    if (!townName) return

    const feature = geojsonData.features.find(
      (item) => item?.properties?.town === townName
    )
    if (!feature) return

    let minLng = Infinity
    let maxLng = -Infinity
    let minLat = Infinity
    let maxLat = -Infinity

    const processCoordinates = (coords) => {
      if (!Array.isArray(coords)) return
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        const [lng, lat] = coords
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        return
      }
      coords.forEach(processCoordinates)
    }

    processCoordinates(feature.geometry?.coordinates)
    if (
      minLng === Infinity ||
      maxLng === -Infinity ||
      minLat === Infinity ||
      maxLat === -Infinity
    ) {
      return
    }

    const centerLng = (minLng + maxLng) / 2
    const centerLat = (minLat + maxLat) / 2
    const updateTooltipPosition = () => {
      const map = mapRef.current?.getMap?.()
      if (!map || typeof map.project !== 'function') return

      const projected = map.project([centerLng, centerLat])
      const tooltipPayload = {
        feature,
        x: projected.x,
        y: projected.y
      }
      setClickedTooltipInfo(tooltipPayload)
      setHoverInfo(tooltipPayload)
    }

    // Set immediately for instant feedback...
    updateTooltipPosition()
    // ...and refresh after zoom animation so tooltip stays anchored.
    const timeoutId = setTimeout(updateTooltipPosition, 1100)
    return () => clearTimeout(timeoutId)
  }, [openTooltipForSelectedCity, selectedCity, matchingTown, geojsonData])

  // When primary filter resets (selectedCity cleared), clear map tooltip/hover windows.
  useEffect(() => {
    if (selectedCity) return
    setClickedTooltipInfo(null)
    setHoverInfo(null)
    setIsHoverTooltipActive(false)
    setPopupInfo(null)
  }, [selectedCity])

  // Zoom to project's geographic focus extent when selectedProject changes
  useEffect(() => {
    if (selectedProject && selectedProject.geographicFocus && geojsonData) {
      // Set map to center on the specified bounds
      const bounds = [
        [-74.0081481933594, 41.1863288879395],
        [-69.8615341186523, 42.8867149353027],
      ]
      
      // Calculate center from bounds
      const centerLng = (bounds[0][0] + bounds[1][0]) / 2
      const centerLat = (bounds[0][1] + bounds[1][1]) / 2
      
      // Set zoom level to 8 as requested
      setViewState({
        longitude: centerLng,
        latitude: centerLat,
        zoom: 8,
        transitionDuration: 1000,
        transitionInterpolator: {
          interpolatePosition: (from, to) => [from[0], from[1]]
        }
      })
    }
  }, [selectedProject, geojsonData])

  // Load Massachusetts towns GeoJSON
  useEffect(() => {
    fetch('/data/Massachusetts.geojson')
      .then(response => response.json())
      .then(data => setGeojsonData(data))
      .catch(error => console.error('Error loading GeoJSON:', error));
  }, []);

  // Load MAPC region outline from ArcGIS REST as GeoJSON.
  useEffect(() => {
    fetch('https://services.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/MAPC_Outline_(single_polygon)/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson')
      .then(response => response.json())
      .then(data => setMapcRegionData(data))
      .catch(error => console.error('Error loading MAPC region GeoJSON:', error));
  }, []);

  const onHover = (event) => {
    if (hoverHideTimeoutRef.current) {
      clearTimeout(hoverHideTimeoutRef.current);
      hoverHideTimeoutRef.current = null;
    }

    const {
      features,
      point: { x, y }
    } = event;
    const hoveredFeature = features && features[0];
    if (hoveredFeature && hoveredFeature.properties && hoveredFeature.properties.town) {
      setHoverInfo({
        feature: hoveredFeature,
        x,
        y
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

  const handleMapClick = (event) => {
    const { features, point } = event;
    const clickedFeature = features && features[0];
    if (clickedFeature && clickedFeature.properties && clickedFeature.properties.town) {
      setClickedTooltipInfo({
        feature: clickedFeature,
        x: point.x,
        y: point.y
      });
      if (viewMode === 'year' && onMunicipalityClick) {
        // In year view, only allow clicking on municipalities with projects
        if (clickedFeature.properties.projectCount > 0) {
          onMunicipalityClick(clickedFeature.properties.town);
        }
      } else if (onCitySelect) {
        // Keep subregion municipalities highlighted when user clicks a town.
        // Subregion mode passes highlightedCities (munis) from Sidebar selection.
        if (Array.isArray(highlightedCities) && highlightedCities.length > 0) {
          return
        }
        onCitySelect(clickedFeature.properties.town);
      }
    } else {
      setClickedTooltipInfo(null);
      setHoverInfo(null);
      setIsHoverTooltipActive(false);
    }
  };

  const cursor = hoverInfo ? 'pointer' : 'default';

  const clickTooltipPosition = useMemo(() => {
    if (!clickedTooltipInfo) return null
    const { x, y } = clickedTooltipInfo
    const ESTIMATED_MAX_HEIGHT = 340
    const TOP_MARGIN = 16
    const flipBelow = y < ESTIMATED_MAX_HEIGHT + TOP_MARGIN
    if (flipBelow) {
      return {
        left: x + 10,
        top: y + 14,
        transform: 'translateX(-50%)',
      }
    }
    return {
      left: x + 10,
      top: y - 10,
      transform: 'translate(-50%, -100%)',
    }
  }, [clickedTooltipInfo])

  const hoverTooltipPosition = useMemo(() => {
    if (!hoverInfo?.feature?.properties?.town) return null
    const { x, y } = hoverInfo
    const flipBelow = y < 32
    if (flipBelow) {
      return {
        left: x + 8,
        top: y + 10,
        transform: 'none',
      }
    }
    return {
      left: x + 8,
      top: y - 8,
      transform: 'translateY(-100%)',
    }
  }, [hoverInfo])

  return (
    <div className="w-full h-full relative">
      {/* Toggle switch for MAPC region outline */}
      <div className="absolute top-25 right-2 z-20 bg-white rounded shadow px-2 py-1 flex items-center space-x-2">
        <label htmlFor="subregion-toggle" className="text-sm font-small text-gray-700">Show MAPC Region</label>
        <input
          id="subregion-toggle"
          type="checkbox"
          checked={showMapcRegionLayer}
          onChange={() => setShowMapcRegionLayer(v => !v)}
          className="accent-gray-500 w-5 h-5"
        />
      </div>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={viewMode === 'year' && choroplethData ? ['massachusetts-choropleth', 'massachusetts-interactive'] : ['massachusetts-interactive']}
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
                'line-color': '#f59e42',
                'line-width': 2.5
              }}
            />
          </Source>
        )}
        {/* Massachusetts Towns Layer */}
        {geojsonData && (
          <Source id="massachusetts" type="geojson" data={choroplethData || geojsonData}>
            {/* Choropleth fill layer for year view */}
            {viewMode === 'year' && choroplethData && (
              <Layer
                id="massachusetts-choropleth"
                type="fill"
                paint={{
                  'fill-color': [
                    'case',
                    ['==', ['get', 'projectCount'], 0],
                    'transparent',
                    ['get', 'choroplethColor']
                  ],
                  'fill-opacity': 0.7
                }}
                filter={['has', 'town']}
              />
            )}
            {/* Transparent fill layer for interaction */}
            <Layer
              id="massachusetts-interactive"
              type="fill"
              paint={{
                'fill-color': '#000',
                'fill-opacity': 0
              }}
              filter={viewMode === 'year' && choroplethData ? ['>', ['get', 'projectCount'], 0] : ['has', 'town']}
            />
            {/* Highlight fill layer for hovered polygon */}
            <Layer
              key={`single-highlight-${selectedCity || 'none'}-${viewMode}`} // Force re-render when selection or view mode changes
              id="massachusetts-highlight"
              type="fill"
              paint={{
                'fill-color': viewMode === 'geographicCount' ? '#86efac' : '#3b82f6', // Light green for geographic mode, blue for city mode
                'fill-opacity': 0.5
              }}
              filter={
                matchingHighlightedTowns.length > 0
                  ? (() => {
                      const clickedTown = clickedTooltipInfo?.feature?.properties?.town
                      return clickedTown ? ['==', 'town', clickedTown] : ['==', 'town', '']
                    })()
                  : selectedCity && selectedCity.toLowerCase().includes('state-wide')
                  ? ['has', 'town']  // Show all polygons when state-wide is selected
                  : (() => {
                      // Check if selectedCity is a MAPC subregion or region-wide
                      const subregion = findMAPCSubregion(selectedCity)
                      if (subregion) {
                        if (subregion.type === 'region-wide') {
                          // Show only MAPC member towns when MAPC Region-wide is selected
                          return ['in', ['get', 'town'], ['literal', subregion.towns]]
                        } else {
                          // Show all towns in the subregion
                          return ['in', ['get', 'town'], ['literal', subregion.towns]]
                        }
                      } else if (matchingTown) {
                        // Individual town selected
                        return ['==', 'town', matchingTown]
                      } else {
                        // Hover state
                        return (hoverInfo && hoverInfo.feature && hoverInfo.feature.properties && hoverInfo.feature.properties.town
                          ? ['==', 'town', hoverInfo.feature.properties.town]
                          : ['==', 'town', ''])
                      }
                    })()
              }
            />
            {/* Multi-city highlight layer for selected project */}
            {matchingHighlightedTowns.length > 0 && (
              <Layer
                key={`multi-highlight-${highlightedCities.join('-')}`} // Force re-render when highlighting changes
                id="massachusetts-multi-highlight"
                type="fill"
                paint={{
                  'fill-color': '#a855f7', // purple for subregion municipalities
                  'fill-opacity': 0.55
                }}
                filter={
                  matchingHighlightedTowns.includes('STATE_WIDE_SPECIAL')
                    ? ['has', 'town'] // Show all polygons when State-Wide is selected
                    : ['in', ['get', 'town'], ['literal', getAllHighlightedTowns()]]
                }
              />
            )}
            {/* Base line layer with green borders */}
            <Layer
              id="massachusetts-line"
              type="line"
              paint={{
                'line-color': '#6fc68e',
                'line-width': 1
              }}
            />
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
        {/* Hover tooltip (name only) */}
        {hoverInfo && hoverInfo.feature?.properties?.town && hoverTooltipPosition && (
          <div
            className="pointer-events-none absolute z-[1080] rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow"
            style={hoverTooltipPosition}
          >
            {hoverInfo.feature.properties.town}
          </div>
        )}
        {/* Click tooltip */}
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
                    setHoverInfo(null);
                    setIsHoverTooltipActive(false);
                  }}
                >
                  Close
                </button>
              </div>
              {viewMode === 'year' && clickedTooltipInfo.feature.properties.projectCount !== undefined && (
                <div className="mt-1 text-xs text-gray-500">
                  {clickedTooltipInfo.feature.properties.projectCount} project{clickedTooltipInfo.feature.properties.projectCount !== 1 ? 's' : ''} ({selectedYear})
                </div>
              )}
              {(() => {
                const town = clickedTooltipInfo?.feature?.properties?.town
                if (!town) return null
                const recentProjects =
                  municipalityHoverProjectsByTown[town.toUpperCase()] ||
                  municipalityHoverProjectsByTown[normalizeTownKey(town)] ||
                  []
                if (recentProjects.length === 0) return null

                const projectsByYear = recentProjects.reduce((acc, item) => {
                  if (!acc[item.year]) acc[item.year] = []
                  acc[item.year].push(item)
                  return acc
                }, {})

                const sortedYears = Object.keys(projectsByYear)
                  .map((y) => parseInt(y, 10))
                  .sort((a, b) => b - a)

                return (
                  <div className="mt-3 border-t border-gray-200 pt-2">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Recent Projects (Last 5 Years)
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {sortedYears.map((year) => {
                        const yearProjects = projectsByYear[year] || []
                        return (
                          <div key={`${town}-${year}`}>
                            <div className="mb-1 text-xs font-semibold text-gray-700">
                              {year} ({yearProjects.length} projects)
                            </div>
                            <div className="space-y-1">
                              {yearProjects.map((item) => (
                                <button
                                  key={`${town}-${year}-${item.id}`}
                                  type="button"
                                  className="block w-full rounded px-2 py-1 text-left text-xs leading-snug text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (onHoverProjectClick) onHoverProjectClick(item.project)
                                  }}
                                >
                                  <span>{item.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              {(() => {
                const town = clickedTooltipInfo?.feature?.properties?.town
                if (!town) return null
                const recentProjects =
                  municipalityHoverProjectsByTown[town.toUpperCase()] ||
                  municipalityHoverProjectsByTown[normalizeTownKey(town)] ||
                  []
                if (recentProjects.length > 0) return null
                return (
                  <div className="mt-2 text-xs text-gray-500">
                    No linked recent projects found for this municipality.
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </Map>
    </div>
  );
};

export default MapComponent;