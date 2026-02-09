package com.ridehailing.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateLocationRequest {
    @NotNull
    private Double lat;

    @NotNull
    private Double lng;
}
