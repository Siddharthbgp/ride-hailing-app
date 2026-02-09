package com.ridehailing.service;

import com.ridehailing.model.Driver;
import com.ridehailing.model.Ride;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocketService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast when a new ride is requested
     */
    public void sendRideRequested(Ride ride) {
        try {
            messagingTemplate.convertAndSend("/topic/ride_requested", ride);
            log.debug("Broadcasted ride_requested: rideId={}", ride.getId());
        } catch (Exception e) {
            log.error("Error broadcasting ride_requested", e);
        }
    }

    /**
     * Broadcast when ride status changes
     */
    public void sendRideStatusUpdated(Ride ride) {
        try {
            messagingTemplate.convertAndSend("/topic/ride_status_updated", ride);
            log.debug("Broadcasted ride_status_updated: rideId={}, status={}", ride.getId(), ride.getStatus());
        } catch (Exception e) {
            log.error("Error broadcasting ride_status_updated", e);
        }
    }

    /**
     * Broadcast when driver location updates
     */
    public void sendDriverLocationUpdated(Driver driver) {
        try {
            messagingTemplate.convertAndSend("/topic/driver_location_updated", driver);
            log.debug("Broadcasted driver_location_updated: driverId={}", driver.getId());
        } catch (Exception e) {
            log.error("Error broadcasting driver_location_updated", e);
        }
    }
}
