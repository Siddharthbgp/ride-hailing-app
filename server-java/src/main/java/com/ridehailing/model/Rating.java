package com.ridehailing.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Rating", indexes = {
        @Index(name = "idx_rating_driver", columnList = "driver_id"),
        @Index(name = "idx_rating_ride", columnList = "ride_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "ride_id", nullable = false)
    private String rideId;

    @Column(name = "driver_id", nullable = false)
    private String driverId;

    @Column(name = "rider_id", nullable = false)
    private String riderId;

    @Column(nullable = false)
    private Integer rating; // 1-5 stars

    @Column(length = 500)
    private String comment;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
