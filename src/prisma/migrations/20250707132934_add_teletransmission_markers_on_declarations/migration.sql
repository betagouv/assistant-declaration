-- AlterTable
ALTER TABLE "EventSerieDeclaration" ADD COLUMN     "lastTransmissionError" TEXT,
ADD COLUMN     "lastTransmissionErrorAt" TIMESTAMP(3),
ADD COLUMN     "transmittedAt" TIMESTAMP(3);
