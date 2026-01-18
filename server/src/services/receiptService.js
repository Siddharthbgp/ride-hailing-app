const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

async function generateReceipt(rideId, fareBreakdown, transactionId = null) {
    try {
        const receipt = await prisma.receipt.create({
            data: {
                rideId,
                baseFare: fareBreakdown.baseFare,
                distanceFare: fareBreakdown.distanceFare,
                surgeFare: fareBreakdown.surgeFare,
                totalFare: fareBreakdown.totalFare,
                paymentStatus: transactionId ? 'completed' : 'pending',
                transactionId
            }
        });

        logger.info('Receipt generated', { rideId, receiptId: receipt.id });
        return receipt;
    } catch (error) {
        logger.error('Error generating receipt', { error: error.message, rideId });
        throw error;
    }
}

async function getReceipt(rideId) {
    try {
        const receipt = await prisma.receipt.findUnique({
            where: { rideId },
            include: {
                ride: {
                    include: {
                        driver: true
                    }
                }
            }
        });

        return receipt;
    } catch (error) {
        logger.error('Error fetching receipt', { error: error.message, rideId });
        throw error;
    }
}

async function updateReceiptPaymentStatus(rideId, status, transactionId) {
    try {
        const receipt = await prisma.receipt.update({
            where: { rideId },
            data: {
                paymentStatus: status,
                transactionId
            }
        });

        logger.info('Receipt payment status updated', { rideId, status });
        return receipt;
    } catch (error) {
        logger.error('Error updating receipt', { error: error.message, rideId });
        throw error;
    }
}

module.exports = {
    generateReceipt,
    getReceipt,
    updateReceiptPaymentStatus
};
