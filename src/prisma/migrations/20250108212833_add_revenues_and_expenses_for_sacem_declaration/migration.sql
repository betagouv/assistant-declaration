-- CreateEnum
CREATE TYPE "AccountingFlux" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountingCategory" AS ENUM ('TICKETING', 'CONSUMPTIONS', 'CATERING', 'PROGRAM_SALES', 'OTHER_REVENUES', 'ENGAGEMENT_CONTRACTS', 'RIGHTS_TRANSFER_CONTRACTS', 'COREALIZATION_CONTRACTS', 'COPRODUCTION_CONTRACTS', 'OTHER_ARTISTIC_CONTRACTS');

-- CreateTable
CREATE TABLE "SacemDeclarationAccountingEntry" (
    "id" UUID NOT NULL,
    "sacemDeclarationId" UUID NOT NULL,
    "flux" "AccountingFlux" NOT NULL,
    "category" "AccountingCategory" NOT NULL,
    "categoryPrecision" TEXT,
    "taxRate" DECIMAL(5,4) NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SacemDeclarationAccountingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SacemDeclarationAccountingEntry_sacemDeclarationId_flux_cat_key" ON "SacemDeclarationAccountingEntry"("sacemDeclarationId", "flux", "category", "categoryPrecision");

-- AddForeignKey
ALTER TABLE "SacemDeclarationAccountingEntry" ADD CONSTRAINT "SacemDeclarationAccountingEntry_sacemDeclarationId_fkey" FOREIGN KEY ("sacemDeclarationId") REFERENCES "EventSerieSacemDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
