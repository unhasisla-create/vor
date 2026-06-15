-- Drop existing table (old data structure is incompatible with per-nopol granularity)
DROP TABLE "RevenueRecord";

-- Recreate with per-nopol structure
CREATE TABLE "RevenueRecord" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "branchId" TEXT NOT NULL,
    "nopol" TEXT NOT NULL,
    "typeUnit" TEXT NOT NULL,
    "targetPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "achRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bop" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueRecord_month_year_branchId_nopol_key" ON "RevenueRecord"("month", "year", "branchId", "nopol");
