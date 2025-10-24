-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING_UPLOAD', 'VALID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('EVENT_SERIE_DOCUMENT');

-- CreateEnum
CREATE TYPE "EventSerieAttachmentType" AS ENUM ('ARTISTIC_CONTRACT', 'PERFORMED_WORK_PROGRAM', 'REVENUE_STATEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "contentType" TEXT NOT NULL,
    "value" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "name" TEXT,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttachmentsOnEventSeries" (
    "eventSerieId" UUID NOT NULL,
    "attachmentId" UUID NOT NULL,
    "type" "EventSerieAttachmentType" NOT NULL DEFAULT 'OTHER',

    CONSTRAINT "AttachmentsOnEventSeries_pkey" PRIMARY KEY ("eventSerieId","attachmentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttachmentsOnEventSeries_attachmentId_key" ON "AttachmentsOnEventSeries"("attachmentId");

-- AddForeignKey
ALTER TABLE "AttachmentsOnEventSeries" ADD CONSTRAINT "AttachmentsOnEventSeries_eventSerieId_fkey" FOREIGN KEY ("eventSerieId") REFERENCES "EventSerie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachmentsOnEventSeries" ADD CONSTRAINT "AttachmentsOnEventSeries_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
