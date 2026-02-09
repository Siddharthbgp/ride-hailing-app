package com.ridehailing.repository;

import com.ridehailing.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, String> {
    List<Ride> findByStatus(String status);

    List<Ride> findByRiderId(String riderId);
}
