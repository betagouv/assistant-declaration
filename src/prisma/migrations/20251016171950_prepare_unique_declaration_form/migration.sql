/*
  Warnings:

  - You are about to drop the column `endAt` on the `EventSerie` table. All the data in the column will be lost.
  - You are about to drop the column `startAt` on the `EventSerie` table. All the data in the column will be lost.
  - You are about to drop the column `taxRate` on the `EventSerie` table. All the data in the column will be lost.
  - You are about to drop the `EventCategoryTickets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventSerieSacdDeclaration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventSerieSacemDeclaration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Phone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SacdDeclarationAccountingEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SacdDeclarationOrganization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SacemDeclarationAccountingEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketCategory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[eventSerieId,type]` on the table `EventSerieDeclaration` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sacemId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sacdId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cateringRevenueExcludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cateringRevenueIncludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumptionsRevenueExcludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumptionsRevenueIncludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `freeTickets` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `otherRevenueExcludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `otherRevenueIncludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paidTickets` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `programSalesRevenueExcludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `programSalesRevenueIncludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketingRevenueDefinedTaxRate` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketingRevenueExcludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketingRevenueIncludingTaxes` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expensesExcludingTaxes` to the `EventSerie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expensesIncludingTaxes` to the `EventSerie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `introductionFeesExpensesExcludingTaxes` to the `EventSerie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `introductionFeesExpensesIncludingTaxes` to the `EventSerie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `EventSerieDeclaration` table without a default value. This is not possible if the table is not empty.
  - Made the column `headquartersAddressId` on table `Organization` required. This step will fail if there are existing NULL values in that column.
  - Made the column `officialHeadquartersId` on table `Organization` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('ALL', 'YOUNG', 'SCHOOL');

-- CreateEnum
CREATE TYPE "PerformanceType" AS ENUM ('OUTDOOR_PERFORMANCE', 'CABARET_AND_MUSIC_HALL', 'CIRCUS_AND_MAGIC', 'MUSICAL_THEATRE', 'DANCE', 'COMEDY_AND_STAND_UP', 'PUPPETRY', 'CLASSICAL_AND_OPERA_AND_CONTEMPORARY_MUSIC', 'POPULAR_AND_JAZZ_MUSIC', 'WORLD_AND_TRADITIONAL_MUSIC_AND_DANCE', 'HISTORICAL_REENACTMENTS_AND_HERITAGE_SOUND_AND_LIGHT_SHOWS', 'LIVE_PERFORMANCE_WITHOUT_DOMINANT_DISCIPLINE', 'ICE_SHOWS_AND_THEME_PARKS_AND_RELATED_PERFORMANCES', 'THEATRE_AND_STORYTELLING_AND_MIME');

-- CreateEnum
CREATE TYPE "DeclarationType" AS ENUM ('SACEM', 'SACD');

-- DropForeignKey
ALTER TABLE "EventCategoryTickets" DROP CONSTRAINT "EventCategoryTickets_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "EventCategoryTickets" DROP CONSTRAINT "EventCategoryTickets_eventId_fkey";

-- DropForeignKey
ALTER TABLE "EventSerieSacdDeclaration" DROP CONSTRAINT "EventSerieSacdDeclaration_eventSerieDeclarationId_fkey";

-- DropForeignKey
ALTER TABLE "EventSerieSacdDeclaration" DROP CONSTRAINT "EventSerieSacdDeclaration_producerId_fkey";

-- DropForeignKey
ALTER TABLE "EventSerieSacemDeclaration" DROP CONSTRAINT "EventSerieSacemDeclaration_eventSerieDeclarationId_fkey";

-- DropForeignKey
ALTER TABLE "SacdDeclarationAccountingEntry" DROP CONSTRAINT "SacdDeclarationAccountingEntry_sacdDeclarationId_fkey";

-- DropForeignKey
ALTER TABLE "SacdDeclarationOrganization" DROP CONSTRAINT "SacdDeclarationOrganization_headquartersAddressId_fkey";

-- DropForeignKey
ALTER TABLE "SacemDeclarationAccountingEntry" DROP CONSTRAINT "SacemDeclarationAccountingEntry_sacemDeclarationId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCategory" DROP CONSTRAINT "TicketCategory_eventSerieId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "audienceOverride" "Audience",
ADD COLUMN     "cateringRevenueExcludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "cateringRevenueIncludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "cateringRevenueTaxRate" DECIMAL(10,2),
ADD COLUMN     "consumptionsRevenueExcludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "consumptionsRevenueIncludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "consumptionsRevenueTaxRate" DECIMAL(10,2),
ADD COLUMN     "freeTickets" INTEGER NOT NULL,
ADD COLUMN     "otherRevenueExcludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "otherRevenueIncludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "otherRevenueTaxRate" DECIMAL(10,2),
ADD COLUMN     "paidTickets" INTEGER NOT NULL,
ADD COLUMN     "placeCapacityOverride" INTEGER,
ADD COLUMN     "placeOverrideId" UUID,
ADD COLUMN     "programSalesRevenueExcludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "programSalesRevenueIncludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "programSalesRevenueTaxRate" DECIMAL(10,2),
ADD COLUMN     "ticketingRevenueDefinedTaxRate" BOOLEAN NOT NULL,
ADD COLUMN     "ticketingRevenueExcludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "ticketingRevenueIncludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "ticketingRevenueTaxRateOverride" DECIMAL(5,4),
ALTER COLUMN "endAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EventSerie" DROP COLUMN "endAt",
DROP COLUMN "startAt",
DROP COLUMN "taxRate",
ADD COLUMN     "audience" "Audience" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "circusSpecificExpensesExcludingTaxes" DECIMAL(10,2),
ADD COLUMN     "circusSpecificExpensesIncludingTaxes" DECIMAL(10,2),
ADD COLUMN     "circusSpecificExpensesTaxRate" DECIMAL(10,2),
ADD COLUMN     "expectedDeclarationTypes" "DeclarationType"[],
ADD COLUMN     "expensesExcludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "expensesIncludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "expensesTaxRate" DECIMAL(10,2),
ADD COLUMN     "introductionFeesExpensesExcludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "introductionFeesExpensesIncludingTaxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "introductionFeesExpensesTaxRate" DECIMAL(10,2),
ADD COLUMN     "lastManualUpdateAt" TIMESTAMP(3),
ADD COLUMN     "performanceType" "PerformanceType",
ADD COLUMN     "placeCapacity" INTEGER,
ADD COLUMN     "placeId" UUID,
ADD COLUMN     "producerName" TEXT,
ADD COLUMN     "producerOfficialId" TEXT,
ADD COLUMN     "ticketingRevenueTaxRate" DECIMAL(5,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventSerieDeclaration" ADD COLUMN     "type" "DeclarationType" NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "sacdId" TEXT,
ADD COLUMN     "sacemId" TEXT,
ALTER COLUMN "headquartersAddressId" SET NOT NULL,
ALTER COLUMN "officialHeadquartersId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TicketingSystem" ADD COLUMN     "forceNextSynchronizationFrom" TIMESTAMP(3);

-- DropTable
DROP TABLE "EventCategoryTickets";

-- DropTable
DROP TABLE "EventSerieSacdDeclaration";

-- DropTable
DROP TABLE "EventSerieSacemDeclaration";

-- DropTable
DROP TABLE "Phone";

-- DropTable
DROP TABLE "SacdDeclarationAccountingEntry";

-- DropTable
DROP TABLE "SacdDeclarationOrganization";

-- DropTable
DROP TABLE "SacemDeclarationAccountingEntry";

-- DropTable
DROP TABLE "TicketCategory";

-- DropEnum
DROP TYPE "AccountingCategory";

-- DropEnum
DROP TYPE "AccountingFlux";

-- DropEnum
DROP TYPE "EventSerieSacdDeclarationAudience";

-- DropEnum
DROP TYPE "EventSerieSacdDeclarationProductionType";

-- DropEnum
DROP TYPE "PhoneType";

-- DropEnum
DROP TYPE "SacdAccountingCategory";

-- CreateTable
CREATE TABLE "Place" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "addressId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_addressId_key" ON "Place"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSerieDeclaration_eventSerieId_type_key" ON "EventSerieDeclaration"("eventSerieId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_sacemId_key" ON "Organization"("sacemId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_sacdId_key" ON "Organization"("sacdId");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSerie" ADD CONSTRAINT "EventSerie_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_placeOverrideId_fkey" FOREIGN KEY ("placeOverrideId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
