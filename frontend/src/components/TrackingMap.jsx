import { useCallback, useEffect, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from '@react-google-maps/api';

const MAP_CONTAINER_STYLE = { width: '100%', height: '400px' };

/**
 * TrackingMap displays the delivery destination, driver's current position,
 * and a polyline connecting the driver to the destination.
 *
 * @param {{ destination: {lat,lng}|null, driverLocation: {lat,lng}|null }} props
 */
export default function TrackingMap({ destination, driverLocation }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const markerRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'seduclog-map',
  });

  // Animate the driver marker smoothly when location updates
  const onDriverMarkerLoad = useCallback((marker) => {
    markerRef.current = marker;
  }, []);

  useEffect(() => {
    if (markerRef.current && driverLocation && window.google) {
      markerRef.current.setPosition(
        new window.google.maps.LatLng(driverLocation.lat, driverLocation.lng)
      );
    }
  }, [driverLocation]);

  if (loadError) {
    return (
      <div className="map-error" role="alert">
        Erro ao carregar o mapa. Verifique a chave da API do Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="map-loading" aria-busy="true">Carregando mapa…</div>;
  }

  const center = driverLocation || destination || { lat: -8.0476, lng: -34.877 };

  const polylinePath =
    driverLocation && destination ? [driverLocation, destination] : [];

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={14}
    >
      {/* Destination pin */}
      {destination && (
        <Marker
          position={destination}
          title="Destino"
          label={{ text: '📦', fontSize: '20px' }}
        />
      )}

      {/* Driver animated marker */}
      {driverLocation && (
        <Marker
          position={driverLocation}
          title="Motorista"
          label={{ text: '🚚', fontSize: '20px' }}
          onLoad={onDriverMarkerLoad}
        />
      )}

      {/* Route polyline */}
      {polylinePath.length === 2 && (
        <Polyline
          path={polylinePath}
          options={{ strokeColor: '#2563EB', strokeWeight: 4, strokeOpacity: 0.8 }}
        />
      )}
    </GoogleMap>
  );
}
