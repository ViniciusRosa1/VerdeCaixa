-- Preserve existing entries without assigning an arbitrary financial account.
ALTER TABLE "FinancialEntry" ADD COLUMN "accountId" UUID;

CREATE INDEX "FinancialEntry_accountId_idx" ON "FinancialEntry"("accountId");

ALTER TABLE "FinancialEntry"
ADD CONSTRAINT "FinancialEntry_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
