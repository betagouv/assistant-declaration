/*
  Warnings:

  - The values [GLOBAL] on the enum `SacdAccountingCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `audience` on the `EventSerieSacdDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `declarationPlace` on the `EventSerieSacdDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `officialHeadquartersId` on the `EventSerieSacdDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `organizerId` on the `EventSerieSacdDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `placeCapacity` on the `EventSerieSacdDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `productionOperationId` on the `EventSerieSacdDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `productionType` on the `EventSerieSacdDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `rightsFeesManagerId` on the `EventSerieSacdDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `SacdDeclarationOrganization` table. All the data in the column will be lost.
  - You are about to drop the column `europeanVatId` on the `SacdDeclarationOrganization` table. All the data in the column will be lost.
  - You are about to drop the column `phoneId` on the `SacdDeclarationOrganization` table. All the data in the column will be lost.
  - You are about to drop the `SacdDeclarationPerformedWork` table. If the table is not empty, all the data it contains will be lost.

*/
-- Custom requests to adjust the data
DELETE FROM "SacdDeclarationAccountingEntry" WHERE "category" = 'GLOBAL';

-- AlterEnum
BEGIN;
CREATE TYPE "SacdAccountingCategory_new" AS ENUM ('SALE_OF_RIGHTS', 'INTRODUCTION_FEES', 'COPRODUCTION_CONTRIBUTION', 'REVENUE_GUARANTEE', 'OTHER');
ALTER TABLE "SacdDeclarationAccountingEntry" ALTER COLUMN "category" TYPE "SacdAccountingCategory_new" USING ("category"::text::"SacdAccountingCategory_new");
ALTER TYPE "SacdAccountingCategory" RENAME TO "SacdAccountingCategory_old";
ALTER TYPE "SacdAccountingCategory_new" RENAME TO "SacdAccountingCategory";
DROP TYPE "SacdAccountingCategory_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "EventSerieSacdDeclaration" DROP CONSTRAINT "EventSerieSacdDeclaration_organizerId_fkey";

-- DropForeignKey
ALTER TABLE "EventSerieSacdDeclaration" DROP CONSTRAINT "EventSerieSacdDeclaration_rightsFeesManagerId_fkey";

-- DropForeignKey
ALTER TABLE "SacdDeclarationOrganization" DROP CONSTRAINT "SacdDeclarationOrganization_phoneId_fkey";

-- DropForeignKey
ALTER TABLE "SacdDeclarationPerformedWork" DROP CONSTRAINT "SacdDeclarationPerformedWork_sacdDeclarationId_fkey";

-- AlterTable
ALTER TABLE "EventSerieSacdDeclaration" DROP COLUMN "audience",
DROP COLUMN "declarationPlace",
DROP COLUMN "officialHeadquartersId",
DROP COLUMN "organizerId",
DROP COLUMN "placeCapacity",
DROP COLUMN "productionOperationId",
DROP COLUMN "productionType",
DROP COLUMN "rightsFeesManagerId",
ADD COLUMN     "placeStreet" TEXT NOT NULL DEFAULT '-';

-- AlterTable
ALTER TABLE "SacdDeclarationOrganization" DROP COLUMN "email",
DROP COLUMN "europeanVatId",
DROP COLUMN "phoneId";

-- DropTable
DROP TABLE "SacdDeclarationPerformedWork";
