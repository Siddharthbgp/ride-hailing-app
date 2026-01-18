const prisma = require('../lib/prisma');
const redisClient = require('../lib/redis');
const socketLib = require('../lib/socket');

async function updateLocation(driverId, lat, lng) {
    // Redis: Update Location (Fast Path)
    try {
        if (redisClient.isOpen) {
            await redisClient.geoAdd('drivers:locations', {
                point: { longitude: parseFloat(lng), latitude: parseFloat(lat) },
                member: driverId
            });
            await redisClient.hSet(`driver:${driverId}`, {
                name: `Driver ${driverId}`,
                status: 'online',
                lat,
                lng
            });
            await redisClient.expire(`driver:${driverId}`, 3600);
        }
    } catch (e) {
        console.error('Redis update error:', e);
    }

    // Optimization: Only write to DB if driver is not "known" to be in DB
    let isKnown = false;
    if (redisClient.isOpen) {
        isKnown = await redisClient.get(`driver:known:${driverId}`);
    }

    let driver;
    if (!isKnown) {
        driver = await prisma.driver.upsert({
            where: { id: driverId },
            update: { lat, lng, status: 'online' },
            create: {
                id: driverId,
                name: `Driver ${driverId}`,
                lat,
                lng,
                status: 'online'
            }
        });
        if (redisClient.isOpen) await redisClient.set(`driver:known:${driverId}`, 'true', { EX: 86400 });
    } else {
        // Construct response object without DB hit
        driver = {
            id: driverId,
            name: `Driver ${driverId}`,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            status: 'online'
        };
    }

    const io = socketLib.getIO();
    if (io) io.emit('driver_location_updated', driver);

    return driver;
}

// Test helper
async function createDriver(data) {
    return prisma.driver.create({ data });
}

module.exports = {
    updateLocation,
    createDriver
};
