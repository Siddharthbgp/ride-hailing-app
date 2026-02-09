package com.ridehailing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AcceptRideRequest {
    @NotBlank
    private String rideId;
}
