const rideService = require('../services/rideService');
const receiptService = require('../services/receiptService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../lib/logger');

const createRide = asyncHandler(async (req, res) => {
    const ride = await rideService.createRide(req.body);
    res.json(ride);
});

const getRide = asyncHandler(async (req, res) => {
    const ride = await rideService.getRideById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    res.json(ride);
});

const startTrip = asyncHandler(async (req, res) => {
    const ride = await rideService.startTrip(req.params.id);
    res.json(ride);
});

const pauseTrip = asyncHandler(async (req, res) => {
    const ride = await rideService.pauseTrip(req.params.id);
    res.json(ride);
});

const resumeTrip = asyncHandler(async (req, res) => {
    const ride = await rideService.resumeTrip(req.params.id);
    res.json(ride);
});

const endTrip = asyncHandler(async (req, res) => {
    const ride = await rideService.endTrip(req.params.id);
    res.json(ride);
});

const cancelRide = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const ride = await rideService.cancelRide(req.params.id, reason);
    res.json(ride);
});

const getReceipt = asyncHandler(async (req, res) => {
    const receipt = await receiptService.getReceipt(req.params.id);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
});

module.exports = {
    createRide,
    getRide,
    startTrip,
    pauseTrip,
    resumeTrip,
    endTrip,
    cancelRide,
    getReceipt
};
