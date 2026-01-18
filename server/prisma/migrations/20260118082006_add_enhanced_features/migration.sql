-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rideId" TEXT NOT NULL,
    "baseFare" REAL NOT NULL,
    "distanceFare" REAL NOT NULL,
    "surgeFare" REAL NOT NULL,
    "totalFare" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riderId" TEXT NOT NULL,
    "driverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "tier" TEXT NOT NULL DEFAULT 'economy',
    "paymentMethod" TEXT NOT NULL DEFAULT 'card',
    "pickupLat" REAL NOT NULL,
    "pickupLng" REAL NOT NULL,
    "destLat" REAL NOT NULL,
    "destLng" REAL NOT NULL,
    "price" REAL NOT NULL,
    "surgeFactor" REAL NOT NULL DEFAULT 1.0,
    "distance" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "pausedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ride" ("completedAt", "createdAt", "destLat", "destLng", "driverId", "id", "pickupLat", "pickupLng", "price", "riderId", "status") SELECT "completedAt", "createdAt", "destLat", "destLng", "driverId", "id", "pickupLat", "pickupLng", "price", "riderId", "status" FROM "Ride";
DROP TABLE "Ride";
ALTER TABLE "new_Ride" RENAME TO "Ride";
CREATE INDEX "Ride_status_idx" ON "Ride"("status");
CREATE INDEX "Ride_driverId_idx" ON "Ride"("driverId");
CREATE INDEX "Ride_riderId_idx" ON "Ride"("riderId");
CREATE INDEX "Ride_createdAt_idx" ON "Ride"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_rideId_key" ON "Receipt"("rideId");

-- CreateIndex
CREATE INDEX "Receipt_rideId_idx" ON "Receipt"("rideId");

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");

-- CreateIndex
CREATE INDEX "Driver_lat_lng_idx" ON "Driver"("lat", "lng");
