-- CreateEnum
CREATE TYPE "PhoneType" AS ENUM ('UNSPECIFIED', 'HOME', 'MOBILE');

-- CreateEnum
CREATE TYPE "EventSerieSacdDeclarationAudience" AS ENUM ('ALL', 'YOUNG', 'SCHOOL', 'READING');

-- CreateEnum
CREATE TYPE "EventSerieSacdDeclarationProductionType" AS ENUM ('AMATEUR', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "SacdAccountingCategory" AS ENUM ('GLOBAL', 'SALE_OF_RIGHTS', 'INTRODUCTION_FEES', 'COPRODUCTION_CONTRIBUTION', 'REVENUE_GUARANTEE', 'OTHER');

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "subdivision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phone" (
    "id" UUID NOT NULL,
    "phoneType" "PhoneType" NOT NULL DEFAULT 'UNSPECIFIED',
    "callingCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SacdDeclarationOrganization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "headquartersAddressId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phoneId" UUID NOT NULL,
    "officialHeadquartersId" TEXT NOT NULL,
    "europeanVatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SacdDeclarationOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSerieSacdDeclaration" (
    "id" UUID NOT NULL,
    "eventSerieDeclarationId" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "officialHeadquartersId" TEXT NOT NULL,
    "productionOperationId" TEXT NOT NULL,
    "productionType" "EventSerieSacdDeclarationProductionType" NOT NULL,
    "placeName" TEXT NOT NULL,
    "placePostalCode" TEXT NOT NULL,
    "placeCity" TEXT NOT NULL,
    "audience" "EventSerieSacdDeclarationAudience" NOT NULL,
    "placeCapacity" INTEGER NOT NULL,
    "organizerId" UUID NOT NULL,
    "producerId" UUID NOT NULL,
    "rightsFeesManagerId" UUID NOT NULL,
    "declarationPlace" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSerieSacdDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SacdDeclarationAccountingEntry" (
    "id" UUID NOT NULL,
    "sacdDeclarationId" UUID NOT NULL,
    "category" "SacdAccountingCategory" NOT NULL,
    "categoryPrecision" TEXT,
    "taxRate" DECIMAL(5,4),
    "amount" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SacdDeclarationAccountingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SacdDeclarationPerformedWork" (
    "id" UUID NOT NULL,
    "sacdDeclarationId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contributors" TEXT[],
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SacdDeclarationPerformedWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventSerieSacdDeclaration_eventSerieDeclarationId_key" ON "EventSerieSacdDeclaration"("eventSerieDeclarationId");

-- CreateIndex
CREATE UNIQUE INDEX "SacdDeclarationAccountingEntry_sacdDeclarationId_category_c_key" ON "SacdDeclarationAccountingEntry"("sacdDeclarationId", "category", "categoryPrecision");

-- CreateIndex
CREATE UNIQUE INDEX "SacdDeclarationPerformedWork_sacdDeclarationId_category_nam_key" ON "SacdDeclarationPerformedWork"("sacdDeclarationId", "category", "name");

-- AddForeignKey
ALTER TABLE "SacdDeclarationOrganization" ADD CONSTRAINT "SacdDeclarationOrganization_headquartersAddressId_fkey" FOREIGN KEY ("headquartersAddressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacdDeclarationOrganization" ADD CONSTRAINT "SacdDeclarationOrganization_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSerieSacdDeclaration" ADD CONSTRAINT "EventSerieSacdDeclaration_eventSerieDeclarationId_fkey" FOREIGN KEY ("eventSerieDeclarationId") REFERENCES "EventSerieDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSerieSacdDeclaration" ADD CONSTRAINT "EventSerieSacdDeclaration_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "SacdDeclarationOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSerieSacdDeclaration" ADD CONSTRAINT "EventSerieSacdDeclaration_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "SacdDeclarationOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSerieSacdDeclaration" ADD CONSTRAINT "EventSerieSacdDeclaration_rightsFeesManagerId_fkey" FOREIGN KEY ("rightsFeesManagerId") REFERENCES "SacdDeclarationOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacdDeclarationAccountingEntry" ADD CONSTRAINT "SacdDeclarationAccountingEntry_sacdDeclarationId_fkey" FOREIGN KEY ("sacdDeclarationId") REFERENCES "EventSerieSacdDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacdDeclarationPerformedWork" ADD CONSTRAINT "SacdDeclarationPerformedWork_sacdDeclarationId_fkey" FOREIGN KEY ("sacdDeclarationId") REFERENCES "EventSerieSacdDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
