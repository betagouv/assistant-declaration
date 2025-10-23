-- CreateTable
CREATE TABLE "SacdAgency" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "matchingFrenchPostalCodesPrefixes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SacdAgency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SacdAgency_email_key" ON "SacdAgency"("email");
