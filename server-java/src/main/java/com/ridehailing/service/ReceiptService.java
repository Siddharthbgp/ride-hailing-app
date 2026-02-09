package com.ridehailing.service;

import com.ridehailing.dto.FareBreakdown;
import com.ridehailing.model.Receipt;
import com.ridehailing.model.Ride;
import com.ridehailing.repository.ReceiptRepository;
import com.ridehailing.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final RideRepository rideRepository;

    /**
     * Generate a receipt for a completed ride
     */
    public Receipt generateReceipt(String rideId, FareBreakdown fareBreakdown) {
        return generateReceipt(rideId, fareBreakdown, null);
    }

    public Receipt generateReceipt(String rideId, FareBreakdown fareBreakdown, String transactionId) {
        try {
            // Check if receipt already exists for this ride
            Optional<Receipt> existingReceipt = receiptRepository.findByRide_Id(rideId);
            if (existingReceipt.isPresent()) {
                log.info("Receipt already exists for ride: rideId={}", rideId);
                return existingReceipt.get();
            }

            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found: " + rideId));

            Receipt receipt = Receipt.builder()
                    .ride(ride)
                    .baseFare(fareBreakdown.getBaseFare())
                    .distanceFare(fareBreakdown.getDistanceFare())
                    .surgeFare(fareBreakdown.getSurgeFare())
                    .totalFare(fareBreakdown.getTotalFare())
                    .paymentStatus(transactionId != null ? "completed" : "pending")
                    .transactionId(transactionId)
                    .build();

            receipt = receiptRepository.save(receipt);

            log.info("Receipt generated: rideId={}, receiptId={}", rideId, receipt.getId());
            return receipt;
        } catch (Exception e) {
            log.error("Error generating receipt: rideId={}", rideId, e);
            throw e;
        }
    }

    /**
     * Get receipt by ride ID
     */
    public Optional<Receipt> getReceipt(String rideId) {
        try {
            return receiptRepository.findByRide_Id(rideId);
        } catch (Exception e) {
            log.error("Error fetching receipt: rideId={}", rideId, e);
            throw e;
        }
    }

    /**
     * Update receipt payment status
     */
    public Receipt updateReceiptPaymentStatus(String rideId, String status, String transactionId) {
        try {
            Receipt receipt = receiptRepository.findByRide_Id(rideId)
                    .orElseThrow(() -> new RuntimeException("Receipt not found for ride: " + rideId));

            receipt.setPaymentStatus(status);
            receipt.setTransactionId(transactionId);
            receipt = receiptRepository.save(receipt);

            log.info("Receipt payment status updated: rideId={}, status={}", rideId, status);
            return receipt;
        } catch (Exception e) {
            log.error("Error updating receipt: rideId={}", rideId, e);
            throw e;
        }
    }
}
