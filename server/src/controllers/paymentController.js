const receiptService = require('../services/receiptService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../lib/logger');

const processPayment = asyncHandler(async (req, res) => {
    const { rideId, amount } = req.body;

    // Mock payment success
    const transactionId = 'txn_' + Math.random().toString(36).substr(2, 9);

    logger.info('Payment processed', { rideId, amount, transactionId });

    // Update receipt with payment status
    try {
        await receiptService.updateReceiptPaymentStatus(rideId, 'completed', transactionId);
    } catch (error) {
        logger.warn('Receipt not found for payment update', { rideId });
    }

    res.json({
        success: true,
        transactionId,
        amount,
        rideId
    });
});

module.exports = { processPayment };
