package com.ridehailing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRideRequest {
    @NotBlank
    private String riderId;

    @NotNull
    private Double pickupLat;

    @NotNull
    private Double pickupLng;

    @NotNull
    private Double destLat;

    @NotNull
    private Double destLng;

    private String tier = "economy";

    private String paymentMethod = "card";
}
