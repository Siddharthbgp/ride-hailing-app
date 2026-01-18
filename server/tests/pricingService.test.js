const pricingService = require('../src/services/pricingService');

describe('Pricing Service', () => {
    describe('calculateFare', () => {
        it('should calculate fare correctly for economy tier', () => {
            const result = pricingService.calculateFare(10, 'economy', 1.0);

            expect(result.baseFare).toBe(50);
            expect(result.distanceFare).toBe(120); // 10 * 12
            expect(result.surgeFare).toBe(0); // No surge
            expect(result.totalFare).toBe(170); // 50 + 120
        });

        it('should calculate fare with surge pricing', () => {
            const result = pricingService.calculateFare(10, 'economy', 2.0);

            expect(result.baseFare).toBe(50);
            expect(result.distanceFare).toBe(120);
            expect(result.surgeFare).toBe(170); // (50 + 120) * (2.0 - 1.0)
            expect(result.totalFare).toBe(340); // 50 + 120 + 170
        });

        it('should calculate fare correctly for premium tier', () => {
            const result = pricingService.calculateFare(10, 'premium', 1.0);

            expect(result.baseFare).toBe(100);
            expect(result.distanceFare).toBe(200); // 10 * 20
            expect(result.totalFare).toBe(300);
        });

        it('should calculate fare correctly for luxury tier', () => {
            const result = pricingService.calculateFare(10, 'luxury', 1.0);

            expect(result.baseFare).toBe(200);
            expect(result.distanceFare).toBe(350); // 10 * 35
            expect(result.totalFare).toBe(550);
        });
    });

    describe('SURGE_CONFIG', () => {
        it('should have correct configuration for all tiers', () => {
            expect(pricingService.SURGE_CONFIG.economy).toBeDefined();
            expect(pricingService.SURGE_CONFIG.premium).toBeDefined();
            expect(pricingService.SURGE_CONFIG.luxury).toBeDefined();
        });
    });
});
