package com.ridehailing.service;

import com.ridehailing.dto.FareBreakdown;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PricingService {

    private final StringRedisTemplate redisTemplate;

    // Surge pricing configuration (matches Node.js SURGE_CONFIG)
    private static final Map<String, TierConfig> SURGE_CONFIG = Map.of(
            "economy", new TierConfig(50.0, 12.0, 1.0, 3.0),
            "premium", new TierConfig(100.0, 20.0, 1.0, 3.5),
            "luxury", new TierConfig(200.0, 35.0, 1.0, 4.0));

    private static final String PENDING_RIDES_KEY = "pending_rides_count";
    private static final String AVAILABLE_DRIVERS_KEY = "available_drivers_count";

    /**
     * Calculate surge factor based on demand/supply ratio
     */
    public double calculateSurgeFactor(double pickupLat, double pickupLng, String tier) {
        try {
            int pendingRides = 0;
            int availableDrivers = 10; // Default

            try {
                String pendingRidesStr = redisTemplate.opsForValue().get(PENDING_RIDES_KEY);
                String availableDriversStr = redisTemplate.opsForValue().get(AVAILABLE_DRIVERS_KEY);

                if (pendingRidesStr != null) {
                    pendingRides = Integer.parseInt(pendingRidesStr);
                }
                if (availableDriversStr != null) {
                    availableDrivers = Integer.parseInt(availableDriversStr);
                }
            } catch (Exception e) {
                log.warn("Redis not available, using default values", e);
            }

            // Calculate demand-supply ratio
            double demandSupplyRatio = availableDrivers > 0
                    ? (double) pendingRides / availableDrivers
                    : 1.0;

            // Calculate surge factor based on ratio
            double surgeFactor = 1.0;
            if (demandSupplyRatio > 2.0) {
                surgeFactor = 3.0; // High demand
            } else if (demandSupplyRatio > 1.0) {
                surgeFactor = 2.0; // Medium demand
            } else if (demandSupplyRatio > 0.5) {
                surgeFactor = 1.5; // Low demand
            }

            // Apply tier-specific limits
            TierConfig config = SURGE_CONFIG.getOrDefault(tier, SURGE_CONFIG.get("economy"));
            surgeFactor = Math.max(config.minSurge, Math.min(surgeFactor, config.maxSurge));

            log.info("Surge factor calculated: tier={}, pendingRides={}, availableDrivers={}, ratio={}, surgeFactor={}",
                    tier, pendingRides, availableDrivers, demandSupplyRatio, surgeFactor);

            return surgeFactor;
        } catch (Exception e) {
            log.error("Error calculating surge factor", e);
            return 1.0; // Default to no surge on error
        }
    }

    /**
     * Calculate total fare with surge pricing
     */
    public FareBreakdown calculateFare(double distance, String tier, double surgeFactor) {
        TierConfig config = SURGE_CONFIG.getOrDefault(tier, SURGE_CONFIG.get("economy"));

        double baseFare = config.baseFare;
        double distanceFare = distance * config.costPerKm;
        double surgeFare = (baseFare + distanceFare) * (surgeFactor - 1.0);
        double totalFare = baseFare + distanceFare + surgeFare;

        return FareBreakdown.builder()
                .baseFare(baseFare)
                .distanceFare(Math.round(distanceFare * 100.0) / 100.0)
                .surgeFare(Math.round(surgeFare * 100.0) / 100.0)
                .totalFare(Math.round(totalFare * 100.0) / 100.0)
                .surgeFactor(surgeFactor)
                .build();
    }

    /**
     * Update demand metrics in Redis
     */
    public void updateDemandMetrics(String action, String type) {
        try {
            String key = "ride".equals(type) ? PENDING_RIDES_KEY : AVAILABLE_DRIVERS_KEY;

            if ("increment".equals(action)) {
                redisTemplate.opsForValue().increment(key);
            } else if ("decrement".equals(action)) {
                String current = redisTemplate.opsForValue().get(key);
                if (current != null && Integer.parseInt(current) > 0) {
                    redisTemplate.opsForValue().decrement(key);
                }
            }
        } catch (Exception e) {
            log.error("Error updating demand metrics", e);
        }
    }

    // Inner class for tier configuration
    private record TierConfig(double baseFare, double costPerKm, double minSurge, double maxSurge) {
    }
}
