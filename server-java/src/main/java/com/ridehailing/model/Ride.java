package com.ridehailing.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Ride", indexes = {
        @Index(name = "idx_ride_status", columnList = "status"),
        @Index(name = "idx_ride_driver", columnList = "driver_id"),
        @Index(name = "idx_ride_rider", columnList = "rider_id"),
        @Index(name = "idx_ride_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "rider_id", nullable = false)
    private String riderId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @Column(nullable = false)
    @Builder.Default
    private String status = "requested"; // requested, assigned, started, paused, completed, cancelled

    @Builder.Default
    private String tier = "economy"; // economy, premium, luxury

    @Column(name = "payment_method")
    @Builder.Default
    private String paymentMethod = "card"; // card, cash, wallet

    @Column(name = "pickup_lat", nullable = false)
    private Double pickupLat;

    @Column(name = "pickup_lng", nullable = false)
    private Double pickupLng;

    @Column(name = "dest_lat", nullable = false)
    private Double destLat;

    @Column(name = "dest_lng", nullable = false)
    private Double destLng;

    @Column(nullable = false)
    private Double price;

    @Column(name = "surge_factor")
    @Builder.Default
    private Double surgeFactor = 1.0;

    private Double distance;

    // 4-digit OTP for rider verification before trip start
    @Column(length = 4)
    private String otp;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "paused_at")
    private LocalDateTime pausedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToOne(mappedBy = "ride", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Receipt receipt;
}
