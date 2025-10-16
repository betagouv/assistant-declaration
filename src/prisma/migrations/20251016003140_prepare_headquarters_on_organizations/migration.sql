/*
  Warnings:

  - A unique constraint covering the columns `[officialHeadquartersId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[headquartersAddressId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "headquartersAddressId" UUID,
ADD COLUMN     "officialHeadquartersId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_officialHeadquartersId_key" ON "Organization"("officialHeadquartersId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_headquartersAddressId_key" ON "Organization"("headquartersAddressId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_headquartersAddressId_fkey" FOREIGN KEY ("headquartersAddressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;
