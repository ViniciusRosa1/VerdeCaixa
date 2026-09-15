-- Separate the global user identity from the company-specific access.
CREATE TABLE "CompanyMembership" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Session" ADD COLUMN "activeMembershipId" UUID;
ALTER TABLE "UserInvitation" ADD COLUMN "membershipId" UUID;

INSERT INTO "CompanyMembership" (
    "id", "companyId", "userId", "roleId", "status", "activatedAt",
    "deactivatedAt", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(), "companyId", "id", "roleId", "status",
    CASE WHEN "status" = 'ACTIVE' THEN "createdAt" ELSE NULL END,
    "deactivatedAt", "createdAt", "updatedAt"
FROM "User";

UPDATE "Session" s
SET "activeMembershipId" = m."id"
FROM "CompanyMembership" m
WHERE m."userId" = s."userId" AND m."status" = 'ACTIVE';

UPDATE "UserInvitation" i
SET "membershipId" = m."id"
FROM "CompanyMembership" m
JOIN "User" u ON u."id" = m."userId"
WHERE i."companyId" = m."companyId" AND lower(i."email") = lower(u."email");

-- Old, unaccepted invitations cannot be safely provisioned without a password.
-- Keep them for audit purposes, but make their old tokens unusable.
UPDATE "UserInvitation"
SET "expiresAt" = CURRENT_TIMESTAMP
WHERE "membershipId" IS NULL AND "acceptedAt" IS NULL;

ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";
DROP INDEX "User_companyId_status_idx";
ALTER TABLE "User" DROP COLUMN "companyId", DROP COLUMN "roleId";

-- Deactivation used to be company-scoped. It now lives on the membership.
UPDATE "User" SET "status" = 'ACTIVE', "deactivatedAt" = NULL;

CREATE UNIQUE INDEX "CompanyMembership_companyId_userId_key" ON "CompanyMembership"("companyId", "userId");
CREATE INDEX "CompanyMembership_companyId_status_idx" ON "CompanyMembership"("companyId", "status");
CREATE INDEX "CompanyMembership_userId_status_idx" ON "CompanyMembership"("userId", "status");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE UNIQUE INDEX "UserInvitation_membershipId_key" ON "UserInvitation"("membershipId");
CREATE INDEX "Session_activeMembershipId_idx" ON "Session"("activeMembershipId");

ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_activeMembershipId_fkey" FOREIGN KEY ("activeMembershipId") REFERENCES "CompanyMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CompanyMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
