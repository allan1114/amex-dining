import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useMap } from 'react-leaflet';
import type { Restaurant } from './model';

const normalIcon = L.divIcon({className:'dining-marker',html:'<span></span>',iconSize:[26,26],iconAnchor:[13,13]});
const activeIcon = L.divIcon({className:'dining-marker selected-marker',html:'<span></span>',iconSize:[32,32],iconAnchor:[16,16]});

/** Own the Leaflet plugin lifecycle; popup content remains React-escaped. */
export function ClusteredPins({restaurants,selected,revision,onSelect,details}: {
 restaurants:Restaurant[];selected:string|null;revision:number;onSelect:(r:Restaurant)=>void;details:(r:Restaurant)=>ReactNode;
}) {
 const map = useMap();
 const group = useMemo(()=>L.markerClusterGroup({
  animate:false, maxClusterRadius:48, showCoverageOnHover:false,
  spiderfyOnMaxZoom:true, zoomToBoundsOnClick:true,
  iconCreateFunction:cluster=>L.divIcon({className:'dining-cluster',html:`<span>${cluster.getChildCount()}</span>`,iconSize:[42,42]}),
 }),[]);
 const entries = useMemo(()=>restaurants.map(r=>({r,node:document.createElement('div'),marker:L.marker([r.coordinates!.lat,r.coordinates!.lng],{icon:normalIcon,title:r.name,alt:r.name})})),[restaurants]);
 const selectRef = useRef(onSelect); selectRef.current=onSelect;
 useEffect(()=>{
  map.addLayer(group);
  for(const {r,node,marker} of entries) {
   marker.bindPopup(node,{maxWidth:310,minWidth:240});
   marker.on('click',()=>selectRef.current(r));
   group.addLayer(marker);
  }
  return ()=>{map.closePopup();group.clearLayers();map.removeLayer(group);for(const {marker} of entries)marker.off();};
 },[map,group,entries]);
 useEffect(()=>{
  let cancelled=false;
  map.closePopup();
  for(const {r,marker} of entries){marker.setIcon(r.id===selected?activeIcon:normalIcon);marker.setZIndexOffset(r.id===selected?1000:0);}
  const entry=entries.find(({r})=>r.id===selected);
  if(entry) group.zoomToShowLayer(entry.marker,()=>{if(!cancelled){map.panTo(entry.marker.getLatLng(),{animate:false});entry.marker.openPopup();}});
  return ()=>{cancelled=true;};
 },[map,group,entries,selected,revision]);
 return <>{entries.map(({r,node})=>createPortal(details(r),node,r.id))}</>;
}
