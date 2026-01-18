const prisma = require('../lib/prisma');
const { getDistance } = require('../utils/geo');
const socketLib = require('../lib/socket');
const logger = require('../lib/logger');
const pricingService = require('./pricingService');
const receiptService = require('./receiptService');

async function createRide({ riderId, pickupLat, pickupLng, destLat, destLng, tier = 'economy', paymentMethod = 'card' }) {
    try {
        const distance = getDistance(pickupLat, pickupLng, destLat, destLng);

        // Calculate surge factor based on demand
        const surgeFactor = await pricingService.calculateSurgeFactor(pickupLat, pickupLng, tier);

        // Calculate fare with surge pricing
        const fareBreakdown = pricingService.calculateFare(distance, tier, surgeFactor);

        const ride = await prisma.ride.create({
            data: {
                riderId,
                pickupLat,
                pickupLng,
                destLat,
                destLng,
                tier,
                paymentMethod,
                distance,
                price: fareBreakdown.totalFare,
                surgeFactor,
                status: 'requested'
            }
        });

        // Update demand metrics
        await pricingService.updateDemandMetrics('increment', 'ride');

        // Notify all online drivers
        const io = socketLib.getIO();
        if (io) io.emit('ride_requested', ride);

        logger.info('Ride created', { rideId: ride.id, tier, surgeFactor, price: ride.price });
        return ride;
    } catch (error) {
        logger.error('Error creating ride', { error: error.message });
        throw error;
    }
}

async function getRideById(id) {
    return prisma.ride.findUnique({
        where: { id },
        include: {
            driver: true,
            receipt: true
        }
    });
}

async function acceptRide(rideId, driverId) {
    try {
        // Transaction to ensure atomicity
        const result = await prisma.$transaction(async (prisma) => {
            const ride = await prisma.ride.findUnique({ where: { id: rideId } });
            if (!ride || ride.status !== 'requested') {
                throw new Error('Ride not available');
            }

            const updateDriver = await prisma.driver.upsert({
                where: { id: driverId },
                update: { status: 'busy' },
                create: {
                    id: driverId,
                    name: `Driver ${driverId}`,
                    status: 'busy'
                }
            });

            const updateRide = await prisma.ride.update({
                where: { id: rideId },
                data: {
                    status: 'assigned',
                    driverId: driverId
                },
                include: { driver: true }
            });

            return { ride: updateRide, driver: updateDriver };
        });

        // Update demand metrics
        await pricingService.updateDemandMetrics('decrement', 'ride');
        await pricingService.updateDemandMetrics('decrement', 'driver');

        const io = socketLib.getIO();
        if (io) io.emit('ride_status_updated', result.ride);

        logger.info('Ride accepted', { rideId, driverId });
        return result.ride;
    } catch (error) {
        logger.error('Error accepting ride', { error: error.message, rideId, driverId });
        throw error;
    }
}

async function startTrip(rideId) {
    try {
        const ride = await prisma.ride.update({
            where: { id: rideId },
            data: {
                status: 'started',
                startedAt: new Date()
            },
            include: { driver: true }
        });

        const io = socketLib.getIO();
        if (io) io.emit('ride_status_updated', ride);

        logger.info('Trip started', { rideId });
        return ride;
    } catch (error) {
        logger.error('Error starting trip', { error: error.message, rideId });
        throw error;
    }
}

async function pauseTrip(rideId) {
    try {
        const ride = await prisma.ride.update({
            where: { id: rideId },
            data: {
                status: 'paused',
                pausedAt: new Date()
            },
            include: { driver: true }
        });

        const io = socketLib.getIO();
        if (io) io.emit('ride_status_updated', ride);

        logger.info('Trip paused', { rideId });
        return ride;
    } catch (error) {
        logger.error('Error pausing trip', { error: error.message, rideId });
        throw error;
    }
}

async function resumeTrip(rideId) {
    try {
        const ride = await prisma.ride.update({
            where: { id: rideId },
            data: {
                status: 'started',
                pausedAt: null
            },
            include: { driver: true }
        });

        const io = socketLib.getIO();
        if (io) io.emit('ride_status_updated', ride);

        logger.info('Trip resumed', { rideId });
        return ride;
    } catch (error) {
        logger.error('Error resuming trip', { error: error.message, rideId });
        throw error;
    }
}

async function endTrip(rideId) {
    try {
        const rideCheck = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!rideCheck) throw new Error('Ride not found');

        const ride = await prisma.ride.update({
            where: { id: rideId },
            data: {
                status: 'completed',
                completedAt: new Date()
            },
            include: { driver: true }
        });

        // Generate receipt
        const fareBreakdown = pricingService.calculateFare(
            ride.distance || 0,
            ride.tier,
            ride.surgeFactor
        );

        await receiptService.generateReceipt(rideId, fareBreakdown);

        // Free up driver
        if (ride.driverId) {
            await prisma.driver.upsert({
                where: { id: ride.driverId },
                update: { status: 'online' },
                create: {
                    id: ride.driverId,
                    name: `Driver ${ride.driverId}`,
                    status: 'online'
                }
            });

            // Update demand metrics
            await pricingService.updateDemandMetrics('increment', 'driver');
        }

        const io = socketLib.getIO();
        if (io) io.emit('ride_status_updated', ride);

        logger.info('Trip ended', { rideId });
        return ride;
    } catch (error) {
        logger.error('Error ending trip', { error: error.message, rideId });
        throw error;
    }
}

async function cancelRide(rideId, reason = 'User cancelled') {
    try {
        const ride = await prisma.ride.update({
            where: { id: rideId },
            data: {
                status: 'cancelled'
            },
            include: { driver: true }
        });

        // Free up driver if assigned
        if (ride.driverId) {
            await prisma.driver.update({
                where: { id: ride.driverId },
                data: { status: 'online' }
            });

            await pricingService.updateDemandMetrics('increment', 'driver');
        }

        // Update demand metrics
        await pricingService.updateDemandMetrics('decrement', 'ride');

        const io = socketLib.getIO();
        if (io) io.emit('ride_status_updated', ride);

        logger.info('Ride cancelled', { rideId, reason });
        return ride;
    } catch (error) {
        logger.error('Error cancelling ride', { error: error.message, rideId });
        throw error;
    }
}

module.exports = {
    createRide,
    getRideById,
    acceptRide,
    startTrip,
    pauseTrip,
    resumeTrip,
    endTrip,
    cancelRide
};
