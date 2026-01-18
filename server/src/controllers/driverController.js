const driverService = require('../services/driverService');
const rideService = require('../services/rideService');
const pricingService = require('../services/pricingService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../lib/logger');

const updateLocation = asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    const driver = await driverService.updateLocation(req.params.id, lat, lng);
    res.json({ success: true, driver });
});

const acceptRide = asyncHandler(async (req, res) => {
    const { rideId } = req.body;
    const driverId = req.params.id;
    const ride = await rideService.acceptRide(rideId, driverId);
    res.json(ride);
});

// Helper for testing
const createDriver = asyncHandler(async (req, res) => {
    const driver = await driverService.createDriver({
        name: req.body.name || 'New Driver',
        lat: req.body.lat,
        lng: req.body.lng
    });

    // Update available drivers count
    await pricingService.updateDemandMetrics('increment', 'driver');

    res.json(driver);
});

const goOnline = asyncHandler(async (req, res) => {
    const driverId = req.params.id;
    await pricingService.updateDemandMetrics('increment', 'driver');
    res.json({ success: true, message: 'Driver is now online' });
});

const goOffline = asyncHandler(async (req, res) => {
    const driverId = req.params.id;
    await pricingService.updateDemandMetrics('decrement', 'driver');
    res.json({ success: true, message: 'Driver is now offline' });
});

module.exports = {
    updateLocation,
    acceptRide,
    createDriver,
    goOnline,
    goOffline
};
