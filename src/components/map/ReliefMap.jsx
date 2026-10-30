import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Layers, MapPin } from 'lucide-react';
import L from 'leaflet';

// Simple SVG icon maker for Leaflet map markers
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

const blueIcon = createCustomIcon('#087E83');
const greenIcon = createCustomIcon('#16845B');

export const ReliefMap = ({ campaigns, applications }) => {
  const defaultCenter = [19.1796, 73.0231]; // Mumbra center

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#087E83]" />
            ReliefGIS Interactive Emergency Operations Map
          </h2>
          <p className="text-xs text-slate-500">Live geo-tagged relief hubs, active disaster zones, and beneficiary clusters.</p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-medium">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#087E83] inline-block border border-white shadow-sm"></span>
            <span className="text-slate-700">Active Campaigns ({campaigns.length})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#16845B] inline-block border border-white shadow-sm"></span>
            <span className="text-slate-700">Beneficiary Requests ({applications.length})</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 h-[520px] relative overflow-hidden">
        <MapContainer 
          center={defaultCenter} 
          zoom={12} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Active Campaigns */}
          {campaigns.map((cmp) => (
            <Marker key={cmp.id} position={cmp.coordinates} icon={blueIcon}>
              <Popup>
                <div className="p-1 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-teal-700 px-1.5 py-0.5 rounded bg-teal-50">
                    Campaign Hub
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">{cmp.title}</h4>
                  <p className="text-xs text-slate-600">{cmp.location}</p>
                  <div className="text-xs font-semibold text-slate-800 pt-1">
                    Raised: ₹{cmp.raisedAmount.toLocaleString()} / ₹{cmp.targetAmount.toLocaleString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render Beneficiary Hotspots */}
          {applications.map((app) => (
            <Marker key={app.id} position={app.coordinates} icon={greenIcon}>
              <Popup>
                <div className="p-1 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-50">
                    Beneficiary Claim
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">{app.beneficiaryName} ({app.id})</h4>
                  <p className="text-xs text-slate-600">{app.area}</p>
                  <div className="text-xs font-semibold text-slate-800 pt-1">
                    Requested: ₹{app.requestedAmount.toLocaleString()} • Status: {app.status}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};