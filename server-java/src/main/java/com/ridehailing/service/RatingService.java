package com.ridehailing.service;

import com.ridehailing.model.Driver;
import com.ridehailing.model.Rating;
import com.ridehailing.model.Ride;
import com.ridehailing.repository.DriverRepository;
import com.ridehailing.repository.RatingRepository;
import com.ridehailing.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RatingService {

    private final RatingRepository ratingRepository;
    private final RideRepository rideRepository;
    private final DriverRepository driverRepository;

    /**
     * Submit a rating for a driver after a ride
     */
    @Transactional
    public Rating submitRating(String rideId, Integer ratingValue, String comment) {
        // Validate rating value
        if (ratingValue < 1 || ratingValue > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }

        // Check if rating already exists for this ride
        Optional<Rating> existingRating = ratingRepository.findByRideId(rideId);
        if (existingRating.isPresent()) {
            throw new RuntimeException("Rating already submitted for this ride");
        }

        // Get the ride
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!"completed".equals(ride.getStatus())) {
            throw new RuntimeException("Can only rate completed rides");
        }

        if (ride.getDriver() == null) {
            throw new RuntimeException("No driver assigned to this ride");
        }

        String driverId = ride.getDriver().getId();

        // Create rating
        Rating rating = Rating.builder()
                .rideId(rideId)
                .driverId(driverId)
                .riderId(ride.getRiderId())
                .rating(ratingValue)
                .comment(comment)
                .build();

        rating = ratingRepository.save(rating);

        // Update driver's average rating
        updateDriverAverageRating(driverId, ratingValue);

        log.info("Rating submitted: rideId={}, driverId={}, rating={}", rideId, driverId, ratingValue);
        return rating;
    }

    /**
     * Update driver's average rating
     */
    private void updateDriverAverageRating(String driverId, Integer newRating) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        int totalRatings = driver.getTotalRatings() != null ? driver.getTotalRatings() : 0;
        double currentAvg = driver.getAverageRating() != null ? driver.getAverageRating() : 0.0;

        // Calculate new average
        double newAvg = ((currentAvg * totalRatings) + newRating) / (totalRatings + 1);

        driver.setTotalRatings(totalRatings + 1);
        driver.setAverageRating(Math.round(newAvg * 10.0) / 10.0); // Round to 1 decimal

        driverRepository.save(driver);

        log.info("Driver average rating updated: driverId={}, newAvg={}, totalRatings={}",
                driverId, driver.getAverageRating(), driver.getTotalRatings());
    }

    /**
     * Get rating for a ride
     */
    public Optional<Rating> getRatingByRideId(String rideId) {
        return ratingRepository.findByRideId(rideId);
    }
}
