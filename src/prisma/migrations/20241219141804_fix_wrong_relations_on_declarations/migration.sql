-- DropForeignKey
ALTER TABLE "EventSerieDeclaration" DROP CONSTRAINT "EventSerieDeclaration_eventSerieId_fkey";

-- DropForeignKey
ALTER TABLE "EventSerieSacemDeclaration" DROP CONSTRAINT "EventSerieSacemDeclaration_eventSerieDeclarationId_fkey";

-- AddForeignKey
ALTER TABLE "EventSerieDeclaration" ADD CONSTRAINT "EventSerieDeclaration_eventSerieId_fkey" FOREIGN KEY ("eventSerieId") REFERENCES "EventSerie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSerieSacemDeclaration" ADD CONSTRAINT "EventSerieSacemDeclaration_eventSerieDeclarationId_fkey" FOREIGN KEY ("eventSerieDeclarationId") REFERENCES "EventSerieDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
