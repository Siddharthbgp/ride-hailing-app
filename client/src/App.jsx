import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import io from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Fix Leaflet Marker Icon
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const socket = io('http://localhost:3000');

function MapClickEvents({ onLocationSelect, mode }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) onLocationSelect(e.latlng);
    },
  });
  return null;
}

const API_URL = 'http://localhost:3000/v1';

export default function App() {
  const [role, setRole] = useState(null); // 'rider' | 'driver'
  const [userId, setUserId] = useState(`user_${Math.floor(Math.random() * 1000)}`);

  // App State
  const [location, setLocation] = useState({ lat: 51.505, lng: -0.09 }); // Default London
  const [drivers, setDrivers] = useState([]);
  const [ride, setRide] = useState(null);
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [statusText, setStatusText] = useState('');
  const [tier, setTier] = useState('economy');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);

  useEffect(() => {
    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.log("Using default location", err)
    );

    // Socket Listeners
    socket.on('driver_location_updated', (driver) => {
      setDrivers(prev => {
        const idx = prev.findIndex(d => d.id === driver.id);
        if (idx > -1) {
          const newDrivers = [...prev];
          newDrivers[idx] = driver;
          return newDrivers;
        }
        return [...prev, driver];
      });
    });

    socket.on('ride_requested', (newRide) => {
      if (role === 'driver') {
        console.log("New ride request!", newRide);
        // In a real app, filter by vicinity. For demo, show all.
        setStatusText(`New Ride Request: Earn $${newRide.price}`);
        setRide(newRide);
      }
    });

    socket.on('ride_status_updated', (updatedRide) => {
      if (ride && ride.id === updatedRide.id) {
        setRide(updatedRide);
        if (updatedRide.status === 'assigned') setStatusText('Driver found! Arriving soon.');
        if (updatedRide.status === 'started') setStatusText('Trip started. Enjoy your ride!');
        if (updatedRide.status === 'paused') setStatusText('Trip paused.');
        if (updatedRide.status === 'completed') {
          setStatusText('Trip Completed. Payment Processed.');
          setRideHistory(prev => [updatedRide, ...prev]);
        }
      }
    });

    return () => {
      socket.off('driver_location_updated');
      socket.off('ride_requested');
      socket.off('ride_status_updated');
    };
  }, [role, ride]);

  // Functions
  const requestRide = async () => {
    if (!pickup || !destination) return alert("Select pickup and destination");

    setLoading(true);
    setError(null);
    setStatusText('Finding a driver...');

    try {
      const res = await fetch(`${API_URL}/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId: userId,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          destLat: destination.lat,
          destLng: destination.lng,
          tier,
          paymentMethod
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create ride');
      }

      const data = await res.json();
      setRide(data);
      setStatusText(`Ride requested! Estimated fare: $${data.price}`);
    } catch (err) {
      setError(err.message);
      setStatusText('Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  const updateDriverLocation = async () => {
    // Simulate movement
    const newLat = location.lat + (Math.random() - 0.5) * 0.01;
    const newLng = location.lng + (Math.random() - 0.5) * 0.01;
    setLocation({ lat: newLat, lng: newLng });

    await fetch(`${API_URL}/drivers/${userId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: newLat, lng: newLng })
    });
  };

  const acceptRide = async () => {
    if (!ride) return;
    await fetch(`${API_URL}/drivers/${userId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId: ride.id })
    });
    setStatusText('Ride Accepted. Proceed to Pickup.');
  };

  const endTrip = async () => {
    if (!ride) return;
    await fetch(`${API_URL}/trips/${ride.id}/end`, { method: 'POST' });

    // Trigger Payment
    await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId: ride.id, amount: ride.price })
    });

    setStatusText('Trip Ended. Available for new rides.');
  };

  const handleMapClick = (latlng) => {
    if (role === 'rider') {
      if (!pickup) setPickup(latlng);
      else if (!destination) setDestination(latlng);
      else {
        // Reset
        setPickup(latlng);
        setDestination(null);
      }
    }
  };

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>GoComet DAW</h1>
        <div>
          {!role && (
            <>
              <button className="btn-secondary" onClick={() => { setRole('rider'); setStatusText('Where to today?'); }} style={{ marginRight: 10 }}>I am a Rider</button>
              <button className="btn-secondary" onClick={() => { setRole('driver'); setStatusText('Go Online to get rides'); }}>I am a Driver</button>
            </>
          )}
          {role && (
            <button className="btn-secondary" onClick={() => { setRole(null); setRide(null); }}>Logout ({role})</button>
          )}
        </div>
      </header>

      {role && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
          {/* Map Section */}
          <div className="map-container glass-panel animate-enter">
            <MapContainer center={location} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <MapClickEvents onLocationSelect={handleMapClick} mode={role} />

              {/* User Location */}
              <Marker position={location}>
                <Popup>You are here</Popup>
              </Marker>

              {/* Pickup/Dest Markers */}
              {pickup && <Marker position={pickup}><Popup>Pickup</Popup></Marker>}
              {destination && <Marker position={destination}><Popup>Destination</Popup></Marker>}

              {/* Other Drivers */}
              {drivers.map(d => (
                <Marker key={d.id} position={[d.lat, d.lng]} opacity={0.7}>
                  <Popup>Driver: {d.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Controls Section */}
          <div className="glass-panel animate-enter" style={{ height: 'fit-content' }}>
            <h2>Status Panel</h2>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '20px', minHeight: '60px' }}>
              <p style={{ margin: 0, color: 'var(--success)' }}>{statusText}</p>
              {ride && <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>Price: ${ride.price}</p>}
            </div>

            {role === 'rider' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {error && (
                  <div style={{ padding: '10px', background: 'rgba(255,0,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,0,0,0.3)' }}>
                    <p style={{ margin: 0, color: '#ff6b6b', fontSize: '0.9rem' }}>{error}</p>
                  </div>
                )}

                <div>
                  <p style={{ marginBottom: 4 }}>1. Select Tier</p>
                  <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                    <option value="economy">Economy - $50 base</option>
                    <option value="premium">Premium - $100 base</option>
                    <option value="luxury">Luxury - $200 base</option>
                  </select>
                </div>

                <div>
                  <p style={{ marginBottom: 4 }}>2. Payment Method</p>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                    <option value="card">Credit/Debit Card</option>
                    <option value="cash">Cash</option>
                    <option value="wallet">Digital Wallet</option>
                  </select>
                </div>

                <div>
                  <p style={{ marginBottom: 4 }}>3. Click Map for Pickup</p>
                  <input value={pickup ? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : ''} readOnly placeholder="Select on Map" />
                </div>
                <div>
                  <p style={{ marginBottom: 4 }}>4. Click Map for Destination</p>
                  <input value={destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : ''} readOnly placeholder="Select on Map" />
                </div>
                <button
                  className="btn-primary"
                  onClick={requestRide}
                  disabled={loading || !pickup || !destination || (ride && ride.status !== 'completed')}
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? 'Requesting...' : (ride && ride.status !== 'completed' ? 'Ride in Progress' : 'Request Ride')}
                </button>
              </div>
            )}

            {role === 'driver' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="btn-secondary" onClick={updateDriverLocation}>Simulate Moving</button>

                {ride && ride.status === 'requested' && (
                  <button className="btn-primary" onClick={acceptRide}>Accept Ride (${ride.price})</button>
                )}

                {ride && ride.status === 'assigned' && (
                  <button className="btn-primary" onClick={endTrip}>End Trip (Simulate)</button>
                )}

                {!ride && <p>Waiting for requests...</p>}
              </div>
            )}

            <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
              <h3>Debug Info</h3>
              <p style={{ fontSize: '0.8rem' }}>User ID: {userId}</p>
              {ride && <p style={{ fontSize: '0.8rem' }}>Ride ID: {ride.id} <br /> Status: {ride.status}</p>}
            </div>
          </div>
        </div>
      )}

      {!role && (
        <div className="glass-panel animate-enter" style={{ marginTop: '20px', textAlign: 'center' }}>
          <h2>Welcome to the Next Gen Ride Hailing</h2>
          <p>Select a role above to get started.</p>
        </div>
      )}
    </div>
  );
}
