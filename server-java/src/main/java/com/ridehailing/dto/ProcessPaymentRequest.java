package com.ridehailing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProcessPaymentRequest {
    @NotBlank
    private String rideId;

    @NotNull
    private Double amount;
}
