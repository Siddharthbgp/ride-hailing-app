// Mock Redis to avoid connection issues in tests
jest.mock('../src/lib/redis', () => ({
    isOpen: false,
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    geoAdd: jest.fn(),
    hSet: jest.fn(),
    expire: jest.fn()
}));

// Suppress console logs during tests
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
};
