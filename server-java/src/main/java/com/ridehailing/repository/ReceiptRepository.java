package com.ridehailing.repository;

import com.ridehailing.model.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, String> {
    // Use ride.id to navigate the relationship
    Optional<Receipt> findByRide_Id(String rideId);
}
