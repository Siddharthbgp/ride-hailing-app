package com.ridehailing.controller;

import com.ridehailing.dto.AcceptRideRequest;
import com.ridehailing.dto.UpdateLocationRequest;
import com.ridehailing.model.Driver;
import com.ridehailing.model.Ride;
import com.ridehailing.service.DriverService;
import com.ridehailing.service.PricingService;
import com.ridehailing.service.RideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;
    private final RideService rideService;
    private final PricingService pricingService;

    /**
     * Update driver location
     * POST /v1/drivers/{id}/location
     */
    @PostMapping("/drivers/{id}/location")
    public ResponseEntity<Map<String, Object>> updateLocation(
            @PathVariable String id,
            @Valid @RequestBody UpdateLocationRequest request) {
        Driver driver = driverService.updateLocation(id, request.getLat(), request.getLng());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "driver", driver));
    }

    /**
     * Accept a ride request
     * POST /v1/drivers/{id}/accept
     */
    @PostMapping("/drivers/{id}/accept")
    public ResponseEntity<Ride> acceptRide(
            @PathVariable String id,
            @Valid @RequestBody AcceptRideRequest request) {
        Ride ride = rideService.acceptRide(request.getRideId(), id);
        return ResponseEntity.ok(ride);
    }

    /**
     * Go online
     * POST /v1/drivers/{id}/online
     */
    @PostMapping("/drivers/{id}/online")
    public ResponseEntity<Map<String, Object>> goOnline(@PathVariable String id) {
        pricingService.updateDemandMetrics("increment", "driver");
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Driver is now online"));
    }

    /**
     * Go offline
     * POST /v1/drivers/{id}/offline
     */
    @PostMapping("/drivers/{id}/offline")
    public ResponseEntity<Map<String, Object>> goOffline(@PathVariable String id) {
        pricingService.updateDemandMetrics("decrement", "driver");
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Driver is now offline"));
    }

    /**
     * Create a new driver (test helper)
     * POST /v1/drivers
     */
    @PostMapping("/drivers")
    public ResponseEntity<Driver> createDriver(@RequestBody(required = false) Map<String, Object> body) {
        String name = body != null ? (String) body.get("name") : null;
        Double lat = body != null && body.get("lat") != null ? ((Number) body.get("lat")).doubleValue() : null;
        Double lng = body != null && body.get("lng") != null ? ((Number) body.get("lng")).doubleValue() : null;

        Driver driver = driverService.createDriver(name, lat, lng);
        pricingService.updateDemandMetrics("increment", "driver");
        return ResponseEntity.ok(driver);
    }
}
