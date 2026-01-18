const { createClient } = require('redis');

const redisClient = createClient();

redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis');
    } catch (e) {
        console.error('Failed to connect to Redis:', e);
    }
})();

module.exports = redisClient;
