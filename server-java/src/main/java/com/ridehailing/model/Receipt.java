package com.ridehailing.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Receipt", indexes = {
        @Index(name = "idx_receipt_ride", columnList = "ride_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ride_id", unique = true, nullable = false)
    @JsonIgnore
    private Ride ride;

    // Transient field for JSON serialization
    @Transient
    private String rideId;

    @Column(name = "base_fare", nullable = false)
    private Double baseFare;

    @Column(name = "distance_fare", nullable = false)
    private Double distanceFare;

    @Column(name = "surge_fare", nullable = false)
    private Double surgeFare;

    @Column(name = "total_fare", nullable = false)
    private Double totalFare;

    @Column(name = "payment_status")
    @Builder.Default
    private String paymentStatus = "pending"; // pending, completed, failed

    @Column(name = "transaction_id")
    private String transactionId;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PostLoad
    private void setRideIdFromRide() {
        if (ride != null) {
            this.rideId = ride.getId();
        }
    }
}
