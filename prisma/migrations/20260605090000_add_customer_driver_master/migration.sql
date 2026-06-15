CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inactiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inactiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE UNIQUE INDEX "Driver_code_key" ON "Driver"("code");

ALTER TABLE "Vehicle" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "driverId" TEXT;

WITH customer_names AS (
    SELECT DISTINCT TRIM("customer") AS name
    FROM "Vehicle"
    WHERE TRIM(COALESCE("customer", '')) <> ''
),
numbered_customers AS (
    SELECT name, ROW_NUMBER() OVER (ORDER BY name) AS rn
    FROM customer_names
)
INSERT INTO "Customer" ("id", "code", "name", "updatedAt")
SELECT gen_random_uuid()::TEXT, 'CUST-' || LPAD(rn::TEXT, 4, '0'), name, CURRENT_TIMESTAMP
FROM numbered_customers;

WITH driver_names AS (
    SELECT DISTINCT TRIM("driver") AS name
    FROM "Vehicle"
    WHERE TRIM(COALESCE("driver", '')) <> ''
),
numbered_drivers AS (
    SELECT name, ROW_NUMBER() OVER (ORDER BY name) AS rn
    FROM driver_names
)
INSERT INTO "Driver" ("id", "code", "name", "updatedAt")
SELECT gen_random_uuid()::TEXT, 'DRV-' || LPAD(rn::TEXT, 4, '0'), name, CURRENT_TIMESTAMP
FROM numbered_drivers;

UPDATE "Vehicle" v
SET "customerId" = c."id"
FROM "Customer" c
WHERE TRIM(v."customer") = c."name";

UPDATE "Vehicle" v
SET "driverId" = d."id"
FROM "Driver" d
WHERE TRIM(v."driver") = d."name";

ALTER TABLE "Driver" ADD CONSTRAINT "Driver_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
