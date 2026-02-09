package com.ridehailing.service;

import com.ridehailing.model.Driver;
import com.ridehailing.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class DriverService {

    private final DriverRepository driverRepository;
    private final StringRedisTemplate redisTemplate;
    private final SocketService socketService;

    private static final String DRIVERS_LOCATION_KEY = "drivers:locations";

    /**
     * Update driver location - with Redis caching optimization
     */
    public Driver updateLocation(String driverId, Double lat, Double lng) {
        // Redis: Update Location (Fast Path)
        try {
            // Store in Redis hash for quick lookups
            String driverKey = "driver:" + driverId;
            redisTemplate.opsForHash().put(driverKey, "name", "Driver " + driverId);
            redisTemplate.opsForHash().put(driverKey, "status", "online");
            redisTemplate.opsForHash().put(driverKey, "lat", lat.toString());
            redisTemplate.opsForHash().put(driverKey, "lng", lng.toString());
            redisTemplate.expire(driverKey, Duration.ofHours(1));

            // Note: Redis GEO commands would require additional setup
            // For simplicity, we skip GEOADD here but it can be added
        } catch (Exception e) {
            log.warn("Redis update error", e);
        }

        // Optimization: Only write to DB if driver is not "known" to be in DB
        String knownKey = "driver:known:" + driverId;
        boolean isKnown = false;
        try {
            isKnown = Boolean.TRUE.equals(redisTemplate.hasKey(knownKey));
        } catch (Exception e) {
            log.warn("Redis check error", e);
        }

        Driver driver;
        if (!isKnown) {
            // First time or cache expired - write to DB
            driver = driverRepository.findById(driverId)
                    .map(existing -> {
                        existing.setLat(lat);
                        existing.setLng(lng);
                        existing.setStatus("online");
                        return driverRepository.save(existing);
                    })
                    .orElseGet(() -> {
                        Driver newDriver = Driver.builder()
                                .id(driverId)
                                .name("Driver " + driverId)
                                .lat(lat)
                                .lng(lng)
                                .status("online")
                                .createdAt(LocalDateTime.now())
                                .build();
                        return driverRepository.save(newDriver);
                    });

            try {
                redisTemplate.opsForValue().set(knownKey, "true", Duration.ofDays(1));
            } catch (Exception e) {
                log.warn("Redis set error", e);
            }
        } else {
            // Construct response object without DB hit
            driver = Driver.builder()
                    .id(driverId)
                    .name("Driver " + driverId)
                    .lat(lat)
                    .lng(lng)
                    .status("online")
                    .build();
        }

        // Broadcast to all clients
        socketService.sendDriverLocationUpdated(driver);

        return driver;
    }

    /**
     * Create a new driver (test helper)
     */
    public Driver createDriver(String name, Double lat, Double lng) {
        Driver driver = Driver.builder()
                .name(name != null ? name : "New Driver")
                .lat(lat)
                .lng(lng)
                .status("online")
                .createdAt(LocalDateTime.now())
                .build();
        return driverRepository.save(driver);
    }

    /**
     * Find driver by ID
     */
    public Driver findById(String driverId) {
        return driverRepository.findById(driverId).orElse(null);
    }

    /**
     * Update driver status
     */
    public Driver updateStatus(String driverId, String status) {
        return driverRepository.findById(driverId)
                .map(driver -> {
                    driver.setStatus(status);
                    return driverRepository.save(driver);
                })
                .orElse(null);
    }
}
