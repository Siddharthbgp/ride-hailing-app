package com.ridehailing.controller;

import com.ridehailing.dto.ProcessPaymentRequest;
import com.ridehailing.service.ReceiptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final ReceiptService receiptService;

    /**
     * Process payment for a ride
     * POST /v1/payments
     */
    @PostMapping("/payments")
    public ResponseEntity<Map<String, Object>> processPayment(@Valid @RequestBody ProcessPaymentRequest request) {
        // Mock payment - in production, integrate with Stripe/PayPal
        String transactionId = "txn_" + UUID.randomUUID().toString().substring(0, 9);

        log.info("Payment processed: rideId={}, amount={}, transactionId={}",
                request.getRideId(), request.getAmount(), transactionId);

        // Update receipt with payment status
        try {
            receiptService.updateReceiptPaymentStatus(request.getRideId(), "completed", transactionId);
        } catch (Exception e) {
            log.warn("Receipt not found for payment update: rideId={}", request.getRideId());
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "transactionId", transactionId,
                "amount", request.getAmount(),
                "rideId", request.getRideId()));
    }
}
