const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'gocomet-daw-secret-key-change-in-production';

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        logger.warn('No authorization header provided', { path: req.path });
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;

    const decoded = verifyToken(token);

    if (!decoded) {
        logger.warn('Invalid token', { path: req.path });
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

// Optional authentication - doesn't fail if no token
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;

        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }

    next();
}

module.exports = {
    authenticate,
    optionalAuth,
    generateToken,
    verifyToken
};
