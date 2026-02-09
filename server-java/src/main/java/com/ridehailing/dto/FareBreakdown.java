package com.ridehailing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FareBreakdown {
    private Double baseFare;
    private Double distanceFare;
    private Double surgeFare;
    private Double totalFare;
    private Double surgeFactor;
}
