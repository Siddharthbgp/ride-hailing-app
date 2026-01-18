/**
 * New Relic Custom Instrumentation
 * 
 * This module provides custom metrics and transaction tracking
 * for the ride-hailing application.
 */

let newrelic;

try {
    newrelic = require('newrelic');
} catch (error) {
    console.warn('New Relic not available:', error.message);
    // Provide mock implementation for development
    newrelic = {
        recordMetric: () => { },
        recordCustomEvent: () => { },
        addCustomAttribute: () => { },
        addCustomAttributes: () => { },
        setTransactionName: () => { },
        noticeError: () => { },
        startBackgroundTransaction: () => () => { },
        getTransaction: () => ({ end: () => { } })
    };
}

/**
 * Track ride creation metrics
 */
function trackRideCreation(rideData) {
    try {
        newrelic.recordCustomEvent('RideCreated', {
            riderId: rideData.riderId,
            tier: rideData.tier,
            paymentMethod: rideData.paymentMethod,
            surgeFactor: rideData.surgeFactor || 1.0,
            estimatedFare: rideData.price,
            timestamp: new Date().toISOString()
        });

        newrelic.recordMetric('Custom/Rides/Created', 1);
        newrelic.recordMetric(`Custom/Rides/Created/${rideData.tier}`, 1);

        if (rideData.surgeFactor > 1.0) {
            newrelic.recordMetric('Custom/Rides/WithSurge', 1);
            newrelic.recordMetric('Custom/Surge/Factor', rideData.surgeFactor);
        }
    } catch (error) {
        console.error('Error tracking ride creation:', error);
    }
}

/**
 * Track ride assignment to driver
 */
function trackRideAssignment(rideId, driverId, assignmentTime) {
    try {
        newrelic.recordCustomEvent('RideAssigned', {
            rideId,
            driverId,
            assignmentTimeMs: assignmentTime,
            timestamp: new Date().toISOString()
        });

        newrelic.recordMetric('Custom/Rides/Assigned', 1);
        newrelic.recordMetric('Custom/Rides/AssignmentTime', assignmentTime);
    } catch (error) {
        console.error('Error tracking ride assignment:', error);
    }
}

/**
 * Track trip lifecycle events
 */
function trackTripEvent(eventType, tripData) {
    try {
        newrelic.recordCustomEvent('TripEvent', {
            eventType,
            tripId: tripData.id,
            riderId: tripData.riderId,
            driverId: tripData.driverId,
            status: tripData.status,
            tier: tripData.tier,
            timestamp: new Date().toISOString()
        });

        newrelic.recordMetric(`Custom/Trips/${eventType}`, 1);

        // Track trip duration for completed trips
        if (eventType === 'completed' && tripData.startedAt && tripData.completedAt) {
            const duration = new Date(tripData.completedAt) - new Date(tripData.startedAt);
            newrelic.recordMetric('Custom/Trips/Duration', duration);
            newrelic.recordMetric(`Custom/Trips/Duration/${tripData.tier}`, duration);
        }
    } catch (error) {
        console.error('Error tracking trip event:', error);
    }
}

/**
 * Track payment processing
 */
function trackPayment(paymentData) {
    try {
        newrelic.recordCustomEvent('PaymentProcessed', {
            receiptId: paymentData.receiptId,
            rideId: paymentData.rideId,
            amount: paymentData.totalFare,
            paymentMethod: paymentData.paymentMethod,
            status: paymentData.status,
            timestamp: new Date().toISOString()
        });

        newrelic.recordMetric('Custom/Payments/Processed', 1);
        newrelic.recordMetric('Custom/Payments/Amount', paymentData.totalFare);
        newrelic.recordMetric(`Custom/Payments/${paymentData.status}`, 1);

        if (paymentData.status === 'completed') {
            newrelic.recordMetric('Custom/Revenue/Total', paymentData.totalFare);
            newrelic.recordMetric(`Custom/Revenue/${paymentData.paymentMethod}`, paymentData.totalFare);
        }
    } catch (error) {
        console.error('Error tracking payment:', error);
    }
}

/**
 * Track driver location updates
 */
function trackDriverLocation(driverId, location) {
    try {
        newrelic.recordMetric('Custom/Drivers/LocationUpdates', 1);

        // Track location update frequency
        const now = Date.now();
        const key = `driver_location_${driverId}`;

        if (global[key]) {
            const timeSinceLastUpdate = now - global[key];
            newrelic.recordMetric('Custom/Drivers/LocationUpdateInterval', timeSinceLastUpdate);
        }

        global[key] = now;
    } catch (error) {
        console.error('Error tracking driver location:', error);
    }
}

/**
 * Track surge pricing calculations
 */
function trackSurgePricing(tier, surgeFactor, demandRatio) {
    try {
        newrelic.recordCustomEvent('SurgePricingCalculated', {
            tier,
            surgeFactor,
            demandRatio,
            timestamp: new Date().toISOString()
        });

        newrelic.recordMetric('Custom/Surge/Calculations', 1);
        newrelic.recordMetric(`Custom/Surge/Factor/${tier}`, surgeFactor);
        newrelic.recordMetric('Custom/Surge/DemandRatio', demandRatio);
    } catch (error) {
        console.error('Error tracking surge pricing:', error);
    }
}

/**
 * Track API errors
 */
function trackError(error, context = {}) {
    try {
        newrelic.noticeError(error, {
            ...context,
            timestamp: new Date().toISOString()
        });

        newrelic.recordMetric('Custom/Errors/Total', 1);

        if (error.statusCode) {
            newrelic.recordMetric(`Custom/Errors/Status/${error.statusCode}`, 1);
        }
    } catch (err) {
        console.error('Error tracking error:', err);
    }
}

/**
 * Track database query performance
 */
function trackDatabaseQuery(operation, duration, model) {
    try {
        newrelic.recordMetric('Custom/Database/Queries', 1);
        newrelic.recordMetric(`Custom/Database/Queries/${operation}`, 1);
        newrelic.recordMetric(`Custom/Database/Duration/${model}`, duration);

        if (duration > 1000) {
            newrelic.recordCustomEvent('SlowDatabaseQuery', {
                operation,
                model,
                duration,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error tracking database query:', error);
    }
}

/**
 * Track Redis operations
 */
function trackRedisOperation(operation, duration, key) {
    try {
        newrelic.recordMetric('Custom/Redis/Operations', 1);
        newrelic.recordMetric(`Custom/Redis/Operations/${operation}`, 1);
        newrelic.recordMetric('Custom/Redis/Duration', duration);

        if (duration > 100) {
            newrelic.recordCustomEvent('SlowRedisOperation', {
                operation,
                key,
                duration,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error tracking Redis operation:', error);
    }
}

/**
 * Track WebSocket events
 */
function trackWebSocketEvent(eventType, connectionCount) {
    try {
        newrelic.recordMetric('Custom/WebSocket/Events', 1);
        newrelic.recordMetric(`Custom/WebSocket/Events/${eventType}`, 1);
        newrelic.recordMetric('Custom/WebSocket/ActiveConnections', connectionCount);
    } catch (error) {
        console.error('Error tracking WebSocket event:', error);
    }
}

/**
 * Track business metrics
 */
function trackBusinessMetrics(metrics) {
    try {
        if (metrics.activeRides !== undefined) {
            newrelic.recordMetric('Custom/Business/ActiveRides', metrics.activeRides);
        }

        if (metrics.availableDrivers !== undefined) {
            newrelic.recordMetric('Custom/Business/AvailableDrivers', metrics.availableDrivers);
        }

        if (metrics.pendingRides !== undefined) {
            newrelic.recordMetric('Custom/Business/PendingRides', metrics.pendingRides);
        }

        if (metrics.completedRidesLast24h !== undefined) {
            newrelic.recordMetric('Custom/Business/CompletedRides24h', metrics.completedRidesLast24h);
        }

        if (metrics.revenueLast24h !== undefined) {
            newrelic.recordMetric('Custom/Business/Revenue24h', metrics.revenueLast24h);
        }
    } catch (error) {
        console.error('Error tracking business metrics:', error);
    }
}

/**
 * Add custom attributes to current transaction
 */
function addTransactionAttributes(attributes) {
    try {
        newrelic.addCustomAttributes(attributes);
    } catch (error) {
        console.error('Error adding transaction attributes:', error);
    }
}

/**
 * Set custom transaction name
 */
function setTransactionName(name) {
    try {
        newrelic.setTransactionName(name);
    } catch (error) {
        console.error('Error setting transaction name:', error);
    }
}

module.exports = {
    newrelic,
    trackRideCreation,
    trackRideAssignment,
    trackTripEvent,
    trackPayment,
    trackDriverLocation,
    trackSurgePricing,
    trackError,
    trackDatabaseQuery,
    trackRedisOperation,
    trackWebSocketEvent,
    trackBusinessMetrics,
    addTransactionAttributes,
    setTransactionName
};
