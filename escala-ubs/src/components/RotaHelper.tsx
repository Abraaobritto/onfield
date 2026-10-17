import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

export function RotaInteligente({ pontos }: { pontos: [number, number][] }) {
  const map = useMap();
  const routingControlRef = useRef<any>(null);

  useEffect(() => {
    if (!map || pontos.length < 2) return;

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    const waypoints = pontos.map(p => L.latLng(p[0], p[1]));

    routingControlRef.current = L.Routing.control({
      waypoints: waypoints,
      // @ts-ignore
      lineOptions: { styles: [{ color: '#0ea5e9', opacity: 0.8, weight: 6 }] },
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      createMarker: () => null // Impede que o roteirizador crie marcadores extras por cima dos nossos
    }).addTo(map);

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, pontos]);

  return null;
}