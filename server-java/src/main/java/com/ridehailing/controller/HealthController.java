package com.ridehailing.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.util.Map;

@RestController
public class HealthController {

    /**
     * Health check endpoint
     * GET /
     */
    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Ride Hailing Server (Java) is running"));
    }

    /**
     * Health check endpoint (alternate)
     * GET /health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "uptime", ManagementFactory.getRuntimeMXBean().getUptime()));
    }
}
