import { useState, useMemo } from 'react'
import { Map, NavigationControl, Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapComponent = ({ data = [] }) => {
  const [viewState, setViewState] = useState({
    longitude: -71.1348306,
    latitude: 42.3142475,
    zoom: 11
  });

  const [popupInfo, setPopupInfo] = useState(null);

  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

 
  const markers = useMemo(() => {
    return data.map((item, index) => ({
      id: index,
      longitude: item.longitude || -71.1348306 + (index * 0.01),
      latitude: item.latitude || 42.3142475 + (index * 0.01),
      name: item.name || `Location ${index + 1}`,
      description: item.description || 'No description available'
    }));
  }, [data]);

  return (
    <div className="w-full h-full">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />
        
        {markers.map(marker => (
          <Marker
            key={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo(marker);
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                backgroundColor: '#ff4444',
                borderRadius: '50%',
                border: '2px solid white',
                cursor: 'pointer'
              }}
            />
          </Marker>
        ))}

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
    </div>
  );
};

export default MapComponent;