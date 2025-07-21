-- CreateTable
CREATE TABLE "SacemAgency" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "matchingFrenchPostalCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SacemAgency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SacemAgency_email_key" ON "SacemAgency"("email");
