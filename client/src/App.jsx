import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Client } from '@stomp/stompjs';
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

// STOMP Client (for Java Spring Boot WebSocket)
let stompClient = null;

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
  const [wsConnected, setWsConnected] = useState(false);

  // OTP and Rating State
  const [otpInput, setOtpInput] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [completedRideInfo, setCompletedRideInfo] = useState(null);

  // WebSocket connection using STOMP over SockJS
  useEffect(() => {
    // Initialize STOMP client
    stompClient = new Client({
      brokerURL: 'ws://localhost:3000/ws',
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        console.log('STOMP: ' + str);
      },
      onConnect: () => {
        console.log('WebSocket Connected');
        setWsConnected(true);

        // Subscribe to driver location updates
        stompClient.subscribe('/topic/driver_location_updated', (message) => {
          const driver = JSON.parse(message.body);
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

        // Subscribe to ride requests (for drivers)
        stompClient.subscribe('/topic/ride_requested', (message) => {
          const newRide = JSON.parse(message.body);
          console.log("New ride request received!", newRide);
          // Always update the ride state - the UI will conditionally show based on role
          setStatusText(`New Ride Request: Earn $${newRide.price}`);
          setRide(newRide);
        });

        // Subscribe to ride status updates
        stompClient.subscribe('/topic/ride_status_updated', (message) => {
          const updatedRide = JSON.parse(message.body);
          console.log("Ride status updated - ID:", updatedRide.id, "Status:", updatedRide.status);

          // Update ride state for any matching ride
          setRide(currentRide => {
            console.log("Comparing IDs - Current:", currentRide?.id, "Updated:", updatedRide.id);
            // If no current ride or different ride, check if this update is for us
            if (!currentRide || currentRide.id !== updatedRide.id) {
              console.log("ID mismatch, ignoring");
              return currentRide;
            }
            console.log("ID match! Updating to status:", updatedRide.status);

            // Update status text based on new status
            if (updatedRide.status === 'assigned') {
              setStatusText('Driver found! Arriving soon.');
              // Show OTP to rider
              if (updatedRide.otp) {
                setStatusText(`Driver assigned! Your OTP is: ${updatedRide.otp}`);
              }
            }
            if (updatedRide.status === 'started') setStatusText('Trip started. Enjoy your ride!');
            if (updatedRide.status === 'paused') setStatusText('Trip paused.');
            if (updatedRide.status === 'completed') {
              setStatusText('Trip Completed! Please rate your driver.');
              setRideHistory(prev => [updatedRide, ...prev]);
              // Show rating modal for rider
              setCompletedRideInfo(updatedRide);
              setShowRatingModal(true);
            }
            if (updatedRide.status === 'cancelled') {
              setStatusText('Ride cancelled.');
              setTimeout(() => {
                setRide(null);
                setPickup(null);
                setDestination(null);
              }, 2000);
            }

            return updatedRide;
          });
        });
      },
      onDisconnect: () => {
        console.log('WebSocket Disconnected');
        setWsConnected(false);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
      }
    });

    stompClient.activate();

    // Cleanup on unmount
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, []);

  // Get initial location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.log("Using default location", err)
    );
  }, []);

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
    const res = await fetch(`${API_URL}/drivers/${userId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId: ride.id })
    });
    const data = await res.json();
    setRide(data); // Update with OTP
    setStatusText('Ride Accepted. Ask rider for OTP to start trip.');
  };

  const startTrip = async () => {
    if (!ride || !otpInput) {
      setStatusText('Please enter the OTP from the rider');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/trips/${ride.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setStatusText('Invalid OTP: ' + (errorData.error || 'Please try again'));
        return;
      }

      const startedRide = await res.json();
      setRide(startedRide);
      setOtpInput('');
      setStatusText('Trip started! Navigate to destination.');
    } catch (err) {
      setStatusText('Error starting trip');
    }
  };

  const submitRating = async () => {
    if (!completedRideInfo || ratingValue === 0) {
      setStatusText('Please select a rating');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/rides/${completedRideInfo.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment })
      });

      if (res.ok) {
        setStatusText('Thank you for your rating!');
        setShowRatingModal(false);
        setRatingValue(0);
        setRatingComment('');
        setCompletedRideInfo(null);
        // Reset for new ride
        setTimeout(() => {
          setRide(null);
          setPickup(null);
          setDestination(null);
          setStatusText('Ready for a new ride!');
        }, 2000);
      }
    } catch (err) {
      setStatusText('Error submitting rating');
    }
  };

  const endTrip = async () => {
    if (!ride) return;

    try {
      console.log("Calling end trip API for ride:", ride.id);
      const endRes = await fetch(`${API_URL}/trips/${ride.id}/end`, { method: 'POST' });

      if (!endRes.ok) {
        const errorData = await endRes.json().catch(() => ({}));
        console.error("End trip API failed:", errorData);
        setStatusText('Failed to end trip: ' + (errorData.error || 'Unknown error'));
        return;
      }

      const endedRide = await endRes.json();
      console.log("End trip API succeeded:", endedRide);

      // Update local state immediately with the response
      setRide(endedRide);
      setStatusText('Trip Completed! Processing payment...');

      // Trigger Payment
      const payRes = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId: ride.id, amount: ride.price })
      });

      if (payRes.ok) {
        setStatusText('Trip Ended. Payment Processed. Available for new rides.');
        // Reset after a delay
        setTimeout(() => {
          setRide(null);
          setPickup(null);
          setDestination(null);
          setStatusText('Ready for new rides!');
        }, 3000);
      }
    } catch (err) {
      console.error("End trip error:", err);
      setStatusText('Error ending trip');
    }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: wsConnected ? 'var(--success)' : 'var(--error)' }}>
            {wsConnected ? '● Connected' : '○ Disconnected'}
          </span>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <p style={{ marginBottom: 4, fontSize: '0.9rem' }}>Enter OTP from Rider:</p>
                      <input
                        type="text"
                        maxLength={4}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="4-digit OTP"
                        style={{ width: '100%', padding: '12px', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.5em' }}
                      />
                    </div>
                    <button className="btn-primary" onClick={startTrip}>Start Trip with OTP</button>
                  </div>
                )}

                {ride && ride.status === 'started' && (
                  <button className="btn-primary" onClick={endTrip}>End Trip (Simulate)</button>
                )}

                {!ride && <p>Waiting for requests...</p>}
              </div>
            )}

            <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
              <h3>Debug Info</h3>
              <p style={{ fontSize: '0.8rem' }}>User ID: {userId}</p>
              <p style={{ fontSize: '0.8rem' }}>Backend: Java/Spring Boot</p>
              {ride && <p style={{ fontSize: '0.8rem' }}>Ride ID: {ride.id} <br /> Status: {ride.status}</p>}
              {ride && ride.otp && role === 'rider' && (
                <p style={{ fontSize: '1.2rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                  🔐 Your OTP: {ride.otp}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && role === 'rider' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2>Rate Your Driver</h2>
            {completedRideInfo && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '1.5rem', color: 'var(--success)' }}>Trip Completed!</p>
                <p style={{ fontSize: '1.2rem' }}>Total Fare: ${completedRideInfo.price}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  style={{
                    fontSize: '2rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: star <= ratingValue ? '#FFD700' : '#555'
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              placeholder="Add a comment (optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              style={{
                width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white'
              }}
              rows={3}
            />

            <button className="btn-primary" onClick={submitRating} style={{ width: '100%' }}>
              Submit Rating
            </button>
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
