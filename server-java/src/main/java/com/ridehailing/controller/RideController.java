package com.ridehailing.controller;

import com.ridehailing.dto.CreateRideRequest;
import com.ridehailing.model.Receipt;
import com.ridehailing.model.Ride;
import com.ridehailing.service.RatingService;
import com.ridehailing.service.ReceiptService;
import com.ridehailing.service.RideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;
    private final ReceiptService receiptService;
    private final RatingService ratingService;

    /**
     * Create a new ride request
     * POST /v1/rides
     */
    @PostMapping("/rides")
    public ResponseEntity<Ride> createRide(@Valid @RequestBody CreateRideRequest request) {
        Ride ride = rideService.createRide(request);
        return ResponseEntity.ok(ride);
    }

    /**
     * Get ride by ID
     * GET /v1/rides/{id}
     */
    @GetMapping("/rides/{id}")
    public ResponseEntity<Ride> getRide(@PathVariable String id) {
        return rideService.getRideById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Start a trip (requires OTP verification)
     * POST /v1/trips/{id}/start
     */
    @PostMapping("/trips/{id}/start")
    public ResponseEntity<Ride> startTrip(@PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String otp = body != null ? body.get("otp") : null;
        Ride ride = rideService.startTrip(id, otp);
        return ResponseEntity.ok(ride);
    }

    /**
     * Pause a trip
     * POST /v1/trips/{id}/pause
     */
    @PostMapping("/trips/{id}/pause")
    public ResponseEntity<Ride> pauseTrip(@PathVariable String id) {
        Ride ride = rideService.pauseTrip(id);
        return ResponseEntity.ok(ride);
    }

    /**
     * Resume a trip
     * POST /v1/trips/{id}/resume
     */
    @PostMapping("/trips/{id}/resume")
    public ResponseEntity<Ride> resumeTrip(@PathVariable String id) {
        Ride ride = rideService.resumeTrip(id);
        return ResponseEntity.ok(ride);
    }

    /**
     * End a trip
     * POST /v1/trips/{id}/end
     */
    @PostMapping("/trips/{id}/end")
    public ResponseEntity<Ride> endTrip(@PathVariable String id) {
        Ride ride = rideService.endTrip(id);
        return ResponseEntity.ok(ride);
    }

    /**
     * Cancel a ride
     * POST /v1/rides/{id}/cancel
     */
    @PostMapping("/rides/{id}/cancel")
    public ResponseEntity<Ride> cancelRide(@PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "User cancelled";
        Ride ride = rideService.cancelRide(id, reason);
        return ResponseEntity.ok(ride);
    }

    /**
     * Get receipt for a ride
     * GET /v1/rides/{id}/receipt
     */
    @GetMapping("/rides/{id}/receipt")
    public ResponseEntity<Receipt> getReceipt(@PathVariable String id) {
        return receiptService.getReceipt(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Submit a rating for a ride
     * POST /v1/rides/{id}/rating
     */
    @PostMapping("/rides/{id}/rating")
    public ResponseEntity<?> submitRating(@PathVariable String id,
            @RequestBody Map<String, Object> body) {
        Integer rating = (Integer) body.get("rating");
        String comment = (String) body.get("comment");

        if (rating == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rating is required"));
        }

        try {
            var result = ratingService.submitRating(id, rating, comment);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
