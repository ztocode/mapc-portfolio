import { useState, useEffect, useRef } from 'react'
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
  onMunicipalityClick = null
}) => {
  const [viewState, setViewState] = useState({
    longitude: -71.0589,
    latitude: 42.3601,
    zoom: 7
  });

  const [geojsonData, setGeojsonData] = useState(null);
  const [subregionData, setSubregionData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [showSubregionLayer, setShowSubregionLayer] = useState(true);
  const [popupInfo, setPopupInfo] = useState(null);
  const lastAlertedCities = useRef('');

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
  }, [highlightedCities]) // Removed onCityNotFound from dependencies

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
      
      // Calculate appropriate zoom level based on bounding box size
      const lngDiff = maxLng - minLng
      const latDiff = maxLat - minLat
      const maxDiff = Math.max(lngDiff, latDiff)
      
              // Set zoom level to 8 as requested
        let zoom = 8
      
      // Position the polygon at the top of the map by adjusting latitude
      // Move the center up so the polygon appears in the upper portion and above the popup window
      // The popup is 50vh tall, so we need to position the polygon in the top 50vh of the map
      const adjustedLat = centerLat + (latDiff * 0.5) // Move up by 50% of the polygon height to ensure it's above the popup
      
      // Animate to the new view state
      setViewState({
        longitude: centerLng,
        latitude: adjustedLat,
        zoom: zoom,
        transitionDuration: 1000,
        transitionInterpolator: {
          interpolatePosition: (from, to) => [from[0], from[1]]
        }
      })
    }
  }

  // Zoom to town when selectedCity changes
  useEffect(() => {
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
        // City not found on map
        onCityNotFound(selectedCity)
      }
    }
  }, [matchingTown, selectedCity, onCityNotFound])

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

  // Load MAPC subregion GeoJSON
  useEffect(() => {
    fetch('/data/MAPC_Subregions.geojson')
      .then(response => response.json())
      .then(data => setSubregionData(data))
      .catch(error => console.error('Error loading Subregion GeoJSON:', error));
  }, []);

  const onHover = (event) => {
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
      setHoverInfo(null);
    }
  };

  const handleMapClick = (event) => {
    const { features } = event;
    const clickedFeature = features && features[0];
    if (clickedFeature && clickedFeature.properties && clickedFeature.properties.town) {
      if (viewMode === 'year' && onMunicipalityClick) {
        // In year view, only allow clicking on municipalities with projects
        if (clickedFeature.properties.projectCount > 0) {
          onMunicipalityClick(clickedFeature.properties.town);
        }
      } else if (onCitySelect) {
        onCitySelect(clickedFeature.properties.town);
      }
    }
  };

  const cursor = hoverInfo ? 'pointer' : 'default';

  return (
    <div className="w-full h-full relative">
      {/* Toggle Switch for Subregion Layer */}
      <div className="absolute top-25 right-2 z-20 bg-white  rounded shadow px-2 py-1 flex items-center space-x-2">
        <label htmlFor="subregion-toggle" className="text-sm font-small text-gray-700">MAPC Subregions</label>
        <input
          id="subregion-toggle"
          type="checkbox"
          checked={showSubregionLayer}
          onChange={() => setShowSubregionLayer(v => !v)}
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
      >
        <NavigationControl position="top-right" />
        {/* MAPC Subregion Layer */}
        {showSubregionLayer && subregionData && (
          <Source id="mapc-subregions" type="geojson" data={subregionData}>
            <Layer
              id="mapc-subregions-fill"
              type="fill"
              paint={{
                'fill-color': '#fbbf24', // amber-400
                'fill-opacity': 0.18
              }}
            />
            <Layer
              id="mapc-subregions-outline"
              type="line"
              paint={{
                'line-color': '#f59e42', // orange-400
                'line-width': 2
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
                selectedCity && selectedCity.toLowerCase().includes('state-wide')
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
                  'fill-color': '#3b82f6', // blue for all highlighted polygons
                  'fill-opacity': 0.6
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
        {/* Hover tooltip */}
        {hoverInfo && (
          <div
            className="absolute z-10 bg-black text-white px-2 py-1 text-sm rounded shadow-lg pointer-events-none"
            style={{
              left: hoverInfo.x + 10,
              top: hoverInfo.y - 10,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div>
              {hoverInfo.feature.properties.town}
              {viewMode === 'year' && hoverInfo.feature.properties.projectCount !== undefined && (
                <div className="text-xs mt-1">
                  {hoverInfo.feature.properties.projectCount} project{hoverInfo.feature.properties.projectCount !== 1 ? 's' : ''} ({selectedYear})
                </div>
              )}
            </div>
          </div>
        )}
      </Map>
    </div>
  );
};

export default MapComponent;