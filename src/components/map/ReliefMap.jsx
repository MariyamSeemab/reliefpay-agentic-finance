import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Layers } from 'lucide-react';
import L from 'leaflet';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../lib/api';
import { formatMoney } from '../../lib/money';

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

const STAFF_ROLES = ['ADMIN', 'REVIEWER', 'AUDITOR'];

const hasCoords = (item) => Array.isArray(item.coordinates) && item.coordinates.every((n) => Number.isFinite(n));

// New applications take their campaign's location, so nudge any request that
// sits exactly on a campaign hub (or another request) so both pins can be clicked.
function spreadOverlaps(campaigns, applications) {
  const taken = new Set(campaigns.map((c) => c.coordinates.join(',')));
  return applications.map((app, i) => {
    let [lat, lng] = app.coordinates;
    let step = 0;
    while (taken.has(`${lat},${lng}`) && step < 12) {
      step += 1;
      const angle = (i + step) * 2.4;
      lat = app.coordinates[0] + 0.004 * step * Math.cos(angle);
      lng = app.coordinates[1] + 0.004 * step * Math.sin(angle);
    }
    taken.add(`${lat},${lng}`);
    return { ...app, coordinates: [lat, lng] };
  });
}

export const ReliefMap = () => {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [rawApplications, setRawApplications] = useState([]);
  const [error, setError] = useState('');

  // Campaigns are public. Staff see every request; a beneficiary sees only
  // their own; donors and volunteers see campaign hubs only.
  useEffect(() => {
    const role = currentUser?.role;
    const appsPath = STAFF_ROLES.includes(role) ? '/applications' : role === 'BENEFICIARY' ? '/applications/mine' : null;
    Promise.all([
      apiFetch('/campaigns', { auth: false }),
      appsPath ? apiFetch(appsPath) : Promise.resolve({ applications: [] }),
    ])
      .then(([c, a]) => {
        setCampaigns((c?.campaigns ?? []).filter(hasCoords));
        setRawApplications((a?.applications ?? []).filter(hasCoords));
      })
      .catch((err) => setError(err.message || 'Could not load map data.'));
  }, [currentUser?.role]);

  const applications = useMemo(() => spreadOverlaps(campaigns, rawApplications), [campaigns, rawApplications]);
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
            <span className="text-slate-700">Relief Campaigns ({campaigns.length})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#16845B] inline-block border border-white shadow-sm"></span>
            <span className="text-slate-700">Beneficiary Requests ({applications.length})</span>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      )}

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
                    Raised: {formatMoney(cmp.raisedAmount, cmp.currency)} / {formatMoney(cmp.targetAmount, cmp.currency)}
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
                    Requested: {formatMoney(app.requestedAmount, app.currency)} • Status: {app.status}
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