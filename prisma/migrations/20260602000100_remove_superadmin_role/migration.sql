UPDATE "User"
SET "role" = 'ADMIN'
WHERE "role"::text = 'SUPERADMIN';

DELETE FROM "User"
WHERE "username" = 'superadmin';

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PLANNER', 'SUPERVISOR', 'MANAGEMENT');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
DROP TYPE "Role_old";
