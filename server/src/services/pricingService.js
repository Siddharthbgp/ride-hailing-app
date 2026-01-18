const redisClient = require('../lib/redis');
const logger = require('../lib/logger');

// Surge pricing configuration
const SURGE_CONFIG = {
    economy: {
        baseFare: 50,
        costPerKm: 12,
        minSurge: 1.0,
        maxSurge: 3.0
    },
    premium: {
        baseFare: 100,
        costPerKm: 20,
        minSurge: 1.0,
        maxSurge: 3.5
    },
    luxury: {
        baseFare: 200,
        costPerKm: 35,
        minSurge: 1.0,
        maxSurge: 4.0
    }
};

// Calculate surge factor based on demand
async function calculateSurgeFactor(pickupLat, pickupLng, tier = 'economy') {
    try {
        // Get number of pending rides in the area (within 5km radius)
        const pendingRidesKey = 'pending_rides_count';
        const availableDriversKey = 'available_drivers_count';

        let pendingRides = 0;
        let availableDrivers = 0;

        if (redisClient.isOpen) {
            pendingRides = parseInt(await redisClient.get(pendingRidesKey) || '0');
            availableDrivers = parseInt(await redisClient.get(availableDriversKey) || '10');
        } else {
            // Default values if Redis is not available
            availableDrivers = 10;
        }

        // Calculate demand-supply ratio
        const demandSupplyRatio = availableDrivers > 0
            ? pendingRides / availableDrivers
            : 1.0;

        // Calculate surge factor
        let surgeFactor = 1.0;

        if (demandSupplyRatio > 2.0) {
            surgeFactor = 3.0; // High demand
        } else if (demandSupplyRatio > 1.0) {
            surgeFactor = 2.0; // Medium demand
        } else if (demandSupplyRatio > 0.5) {
            surgeFactor = 1.5; // Low demand
        }

        // Apply tier-specific limits
        const config = SURGE_CONFIG[tier] || SURGE_CONFIG.economy;
        surgeFactor = Math.max(config.minSurge, Math.min(surgeFactor, config.maxSurge));

        logger.info('Surge factor calculated', {
            tier,
            pendingRides,
            availableDrivers,
            demandSupplyRatio,
            surgeFactor
        });

        return surgeFactor;
    } catch (error) {
        logger.error('Error calculating surge factor', { error: error.message });
        return 1.0; // Default to no surge on error
    }
}

// Calculate total fare with surge pricing
function calculateFare(distance, tier = 'economy', surgeFactor = 1.0) {
    const config = SURGE_CONFIG[tier] || SURGE_CONFIG.economy;

    const baseFare = config.baseFare;
    const distanceFare = distance * config.costPerKm;
    const surgeFare = (baseFare + distanceFare) * (surgeFactor - 1.0);
    const totalFare = baseFare + distanceFare + surgeFare;

    return {
        baseFare,
        distanceFare: Math.round(distanceFare),
        surgeFare: Math.round(surgeFare),
        totalFare: Math.round(totalFare),
        surgeFactor
    };
}

// Update demand metrics
async function updateDemandMetrics(action, type) {
    if (!redisClient.isOpen) return;

    try {
        const key = type === 'ride' ? 'pending_rides_count' : 'available_drivers_count';

        if (action === 'increment') {
            await redisClient.incr(key);
        } else if (action === 'decrement') {
            const current = parseInt(await redisClient.get(key) || '0');
            if (current > 0) {
                await redisClient.decr(key);
            }
        }
    } catch (error) {
        logger.error('Error updating demand metrics', { error: error.message });
    }
}

module.exports = {
    calculateSurgeFactor,
    calculateFare,
    updateDemandMetrics,
    SURGE_CONFIG
};
