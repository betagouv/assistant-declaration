import { AttachmentStatus } from '@prisma/client';
import { subDays } from 'date-fns';
import PgBoss from 'pg-boss';

import { prisma } from '@ad/src/prisma';

export const cleanPendingUploadsTopic = 'clean-pending-uploads';

export async function cleanPendingUploads(job: PgBoss.Job<void>) {
  console.log('starting the job of cleaning pending uploads');

  const deletedAttachments = await prisma.attachment.deleteMany({
    where: {
      createdAt: {
        // Wait 7 days just for temporary file to be seen with valid link but also investigated
        lte: subDays(new Date(), 7),
      },
      status: {
        not: AttachmentStatus.VALID,
      },
      AttachmentsOnEventSeries: {
        is: null,
      },
    },
  });

  console.log(`the job of cleaning pending uploads has completed and removed ${deletedAttachments.count} attachments`);
}
