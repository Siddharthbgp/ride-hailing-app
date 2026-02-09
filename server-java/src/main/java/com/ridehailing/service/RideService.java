package com.ridehailing.service;

import com.ridehailing.dto.CreateRideRequest;
import com.ridehailing.dto.FareBreakdown;
import com.ridehailing.model.Driver;
import com.ridehailing.model.Ride;
import com.ridehailing.repository.DriverRepository;
import com.ridehailing.repository.RideRepository;
import com.ridehailing.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideService {

    private final RideRepository rideRepository;
    private final DriverRepository driverRepository;
    private final PricingService pricingService;
    private final ReceiptService receiptService;
    private final SocketService socketService;

    /**
     * Create a new ride request
     */
    public Ride createRide(CreateRideRequest request) {
        try {
            // Calculate distance using Haversine formula
            double distance = GeoUtils.getDistance(
                    request.getPickupLat(), request.getPickupLng(),
                    request.getDestLat(), request.getDestLng());

            // Calculate surge factor based on demand
            double surgeFactor = pricingService.calculateSurgeFactor(
                    request.getPickupLat(), request.getPickupLng(),
                    request.getTier() != null ? request.getTier() : "economy");

            // Calculate fare with surge pricing
            String tier = request.getTier() != null ? request.getTier() : "economy";
            FareBreakdown fareBreakdown = pricingService.calculateFare(distance, tier, surgeFactor);

            // Create ride entity
            Ride ride = Ride.builder()
                    .riderId(request.getRiderId())
                    .pickupLat(request.getPickupLat())
                    .pickupLng(request.getPickupLng())
                    .destLat(request.getDestLat())
                    .destLng(request.getDestLng())
                    .tier(tier)
                    .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "card")
                    .distance(distance)
                    .price(fareBreakdown.getTotalFare())
                    .surgeFactor(surgeFactor)
                    .status("requested")
                    .createdAt(LocalDateTime.now())
                    .build();

            ride = rideRepository.save(ride);

            // Update demand metrics
            pricingService.updateDemandMetrics("increment", "ride");

            // Notify all online drivers via WebSocket
            socketService.sendRideRequested(ride);

            log.info("Ride created: rideId={}, tier={}, surgeFactor={}, price={}",
                    ride.getId(), tier, surgeFactor, ride.getPrice());

            return ride;
        } catch (Exception e) {
            log.error("Error creating ride", e);
            throw new RuntimeException("Failed to create ride: " + e.getMessage());
        }
    }

    /**
     * Get ride by ID with related entities
     */
    public Optional<Ride> getRideById(String id) {
        return rideRepository.findById(id);
    }

    /**
     * Driver accepts a ride request
     */
    @Transactional
    public Ride acceptRide(String rideId, String driverId) {
        try {
            // Find and validate ride
            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));

            if (!"requested".equals(ride.getStatus())) {
                throw new RuntimeException("Ride not available");
            }

            // Find or create driver
            Driver driver = driverRepository.findById(driverId)
                    .orElseGet(() -> Driver.builder()
                            .id(driverId)
                            .name("Driver " + driverId)
                            .status("busy")
                            .createdAt(LocalDateTime.now())
                            .build());

            driver.setStatus("busy");
            driver = driverRepository.save(driver);

            // Generate 4-digit OTP for rider verification
            String otp = String.format("%04d", new Random().nextInt(10000));

            // Update ride with driver assignment and OTP
            ride.setStatus("assigned");
            ride.setDriver(driver);
            ride.setOtp(otp);
            ride = rideRepository.save(ride);

            // Update demand metrics
            pricingService.updateDemandMetrics("decrement", "ride");
            pricingService.updateDemandMetrics("decrement", "driver");

            // Broadcast status update
            socketService.sendRideStatusUpdated(ride);

            log.info("Ride accepted: rideId={}, driverId={}", rideId, driverId);

            return ride;
        } catch (Exception e) {
            log.error("Error accepting ride: rideId={}, driverId={}", rideId, driverId, e);
            throw new RuntimeException("Failed to accept ride: " + e.getMessage());
        }
    }

    /**
     * Start a trip with OTP verification
     */
    public Ride startTrip(String rideId, String otp) {
        try {
            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));

            // Validate OTP
            if (ride.getOtp() == null || !ride.getOtp().equals(otp)) {
                throw new RuntimeException("Invalid OTP");
            }

            if (!"assigned".equals(ride.getStatus())) {
                throw new RuntimeException("Ride must be assigned before starting");
            }

            ride.setStatus("started");
            ride.setStartedAt(LocalDateTime.now());
            ride.setOtp(null); // Clear OTP after verification
            ride = rideRepository.save(ride);

            socketService.sendRideStatusUpdated(ride);

            log.info("Trip started: rideId={}", rideId);
            return ride;
        } catch (Exception e) {
            log.error("Error starting trip: rideId={}", rideId, e);
            throw new RuntimeException("Failed to start trip: " + e.getMessage());
        }
    }

    /**
     * Pause a trip
     */
    public Ride pauseTrip(String rideId) {
        try {
            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));

            ride.setStatus("paused");
            ride.setPausedAt(LocalDateTime.now());
            ride = rideRepository.save(ride);

            socketService.sendRideStatusUpdated(ride);

            log.info("Trip paused: rideId={}", rideId);
            return ride;
        } catch (Exception e) {
            log.error("Error pausing trip: rideId={}", rideId, e);
            throw new RuntimeException("Failed to pause trip: " + e.getMessage());
        }
    }

    /**
     * Resume a paused trip
     */
    public Ride resumeTrip(String rideId) {
        try {
            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));

            ride.setStatus("started");
            ride.setPausedAt(null);
            ride = rideRepository.save(ride);

            socketService.sendRideStatusUpdated(ride);

            log.info("Trip resumed: rideId={}", rideId);
            return ride;
        } catch (Exception e) {
            log.error("Error resuming trip: rideId={}", rideId, e);
            throw new RuntimeException("Failed to resume trip: " + e.getMessage());
        }
    }

    /**
     * End a trip
     */
    @Transactional
    public Ride endTrip(String rideId) {
        try {
            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));

            ride.setStatus("completed");
            ride.setCompletedAt(LocalDateTime.now());
            ride = rideRepository.save(ride);

            // Generate receipt
            FareBreakdown fareBreakdown = pricingService.calculateFare(
                    ride.getDistance() != null ? ride.getDistance() : 0.0,
                    ride.getTier(),
                    ride.getSurgeFactor());
            receiptService.generateReceipt(rideId, fareBreakdown);

            // Free up driver
            if (ride.getDriver() != null) {
                Driver driver = ride.getDriver();
                driver.setStatus("online");
                driverRepository.save(driver);

                pricingService.updateDemandMetrics("increment", "driver");
            }

            socketService.sendRideStatusUpdated(ride);

            log.info("Trip ended: rideId={}", rideId);
            return ride;
        } catch (Exception e) {
            log.error("Error ending trip: rideId={}", rideId, e);
            throw new RuntimeException("Failed to end trip: " + e.getMessage());
        }
    }

    /**
     * Cancel a ride
     */
    @Transactional
    public Ride cancelRide(String rideId, String reason) {
        try {
            Ride ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new RuntimeException("Ride not found"));

            ride.setStatus("cancelled");
            ride = rideRepository.save(ride);

            // Free up driver if assigned
            if (ride.getDriver() != null) {
                Driver driver = ride.getDriver();
                driver.setStatus("online");
                driverRepository.save(driver);

                pricingService.updateDemandMetrics("increment", "driver");
            }

            // Update demand metrics
            pricingService.updateDemandMetrics("decrement", "ride");

            socketService.sendRideStatusUpdated(ride);

            log.info("Ride cancelled: rideId={}, reason={}", rideId, reason);
            return ride;
        } catch (Exception e) {
            log.error("Error cancelling ride: rideId={}", rideId, e);
            throw new RuntimeException("Failed to cancel ride: " + e.getMessage());
        }
    }
}
