package com.ridehailing.repository;

import com.ridehailing.model.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, String> {

    List<Rating> findByDriverId(String driverId);

    Optional<Rating> findByRideId(String rideId);

    List<Rating> findByRiderId(String riderId);
}
