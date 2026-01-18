const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const driverController = require('../controllers/driverController');
const paymentController = require('../controllers/paymentController');
const { validate } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');

// Apply optional auth to all routes (for logging purposes)
router.use(optionalAuth);

// Ride Routes
router.post('/rides', validate('createRide'), rideController.createRide);
router.get('/rides/:id', rideController.getRide);
router.post('/trips/:id/start', rideController.startTrip);
router.post('/trips/:id/pause', rideController.pauseTrip);
router.post('/trips/:id/resume', rideController.resumeTrip);
router.post('/trips/:id/end', rideController.endTrip);
router.post('/rides/:id/cancel', rideController.cancelRide);
router.get('/rides/:id/receipt', rideController.getReceipt);

// Driver Routes
router.post('/drivers/:id/location', validate('updateLocation'), driverController.updateLocation);
router.post('/drivers/:id/accept', validate('acceptRide'), driverController.acceptRide);
router.post('/drivers/:id/online', driverController.goOnline);
router.post('/drivers/:id/offline', driverController.goOffline);
router.post('/drivers', driverController.createDriver);

// Payment Routes
router.post('/payments', validate('processPayment'), paymentController.processPayment);

module.exports = router;
