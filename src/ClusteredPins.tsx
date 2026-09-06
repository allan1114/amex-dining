import { useEffect, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useMap } from 'react-leaflet';
import type { Restaurant } from './model';

const normalIcon = L.divIcon({ className: 'dining-marker', html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 13] });
const activeIcon = L.divIcon({ className: 'dining-marker selected-marker', html: '<span></span>', iconSize: [32, 32], iconAnchor: [16, 16] });

interface Entry { r: Restaurant; marker: L.Marker; host: HTMLDivElement }

/**
 * Clustered Leaflet markers driven by React props. Popup bodies are rendered into
 * one React-rendered element per marker via createPortal, so the React tree owns
 * the DOM and the leaflet popup content never desynchronizes from selection.
 */
export function ClusteredPins({ restaurants, selected, revision, onSelect, details }: {
  restaurants: Restaurant[];
  selected: string | null;
  revision: number;
  onSelect: (r: Restaurant) => void;
  details: (r: Restaurant) => ReactNode;
}) {
  const map = useMap();
  const group = useMemo(() => L.markerClusterGroup({
    animate: false,
    maxClusterRadius: 32,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    iconCreateFunction: cluster => L.divIcon({ className: 'dining-cluster', html: `<span>${cluster.getChildCount()}</span>`, iconSize: [42, 42] }),
  }), []);
  const entries = useMemo<Entry[]>(
    () => restaurants.map(r => ({ r, marker: L.marker([r.coordinates!.lat, r.coordinates!.lng], { icon: normalIcon, title: r.name, alt: r.name }), host: document.createElement('div') })),
    [restaurants],
  );

  useEffect(() => {
    map.addLayer(group);
    for (const entry of entries) {
      entry.marker.bindPopup(entry.host, { maxWidth: 310, minWidth: 240 });
      entry.marker.on('click', () => onSelect(entry.r));
      group.addLayer(entry.marker);
    }
    return () => {
      map.closePopup();
      group.clearLayers();
      map.removeLayer(group);
      for (const entry of entries) entry.marker.off();
    };
  }, [map, group, entries, onSelect]);

  useEffect(() => {
    let cancelled = false;
    for (const entry of entries) {
      entry.marker.setIcon(entry.r.id === selected ? activeIcon : normalIcon);
      entry.marker.setZIndexOffset(entry.r.id === selected ? 1000 : 0);
    }
    const target = entries.find(entry => entry.r.id === selected);
    if (target) {
      if (target.marker.isPopupOpen()) map.closePopup();
      group.zoomToShowLayer(target.marker, () => {
        if (cancelled) return;
        map.panTo(target.marker.getLatLng(), { animate: false });
        target.marker.openPopup();
      });
    }
    return () => { cancelled = true; };
  }, [map, group, entries, selected, revision]);

  return (
    <>
      {entries.map(entry => (
        <MarkerPortal key={entry.r.id} host={entry.host}>
          {details(entry.r)}
        </MarkerPortal>
      ))}
    </>
  );
}

function MarkerPortal({ host, children }: { host: HTMLElement; children: ReactNode }) {
  return createPortal(children, host);
}
