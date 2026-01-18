const Joi = require('joi');
const logger = require('../lib/logger');

const schemas = {
    createRide: Joi.object({
        riderId: Joi.string().required(),
        pickupLat: Joi.number().min(-90).max(90).required(),
        pickupLng: Joi.number().min(-180).max(180).required(),
        destLat: Joi.number().min(-90).max(90).required(),
        destLng: Joi.number().min(-180).max(180).required(),
        tier: Joi.string().valid('economy', 'premium', 'luxury').default('economy'),
        paymentMethod: Joi.string().valid('card', 'cash', 'wallet').default('card')
    }),

    updateLocation: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
    }),

    acceptRide: Joi.object({
        rideId: Joi.string().required()
    }),

    processPayment: Joi.object({
        rideId: Joi.string().required(),
        amount: Joi.number().min(0).required()
    })
};

function validate(schemaName) {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            logger.error(`Validation schema ${schemaName} not found`);
            return next();
        }

        const { error, value } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            logger.warn('Validation failed', { errors, body: req.body });

            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        req.body = value;
        next();
    };
}

module.exports = { validate, schemas };
