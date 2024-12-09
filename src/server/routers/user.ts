import { LiveChatSettings } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { GetInterfaceSessionSchema, GetLiveChatSettingsSchema, GetProfileSchema, UpdateProfileSchema } from '@ad/src/models/actions/user';
import { userNotFoundError } from '@ad/src/models/entities/errors';
import { UserInterfaceSessionSchema } from '@ad/src/models/entities/ui';
import { LiveChatSettingsSchema, LiveChatSettingsSchemaType } from '@ad/src/models/entities/user';
import { prisma } from '@ad/src/prisma/client';
import { userPrismaToModel } from '@ad/src/server/routers/mappers';
import { privateProcedure, publicProcedure, router } from '@ad/src/server/trpc';
import { signEmail } from '@ad/src/utils/crisp';

export const userRouter = router({
  updateProfile: privateProcedure.input(UpdateProfileSchema).mutation(async ({ ctx, input }) => {
    const user = await prisma.user.update({
      where: {
        id: ctx.user.id,
      },
      data: {
        firstname: input.firstname,
        lastname: input.lastname,
      },
    });

    return { user: userPrismaToModel(user) };
  }),
  getProfile: privateProcedure.input(GetProfileSchema).query(async ({ ctx, input }) => {
    const user = await prisma.user.findUnique({
      where: {
        id: ctx.user.id,
      },
    });

    if (!user) {
      throw userNotFoundError;
    }

    return { user: userPrismaToModel(user) };
  }),
  getInterfaceSession: privateProcedure.input(GetInterfaceSessionSchema).query(async ({ ctx, input }) => {
    const user = await prisma.user.findUnique({
      where: {
        id: ctx.user.id,
      },
      include: {
        Admin: true,
        Collaborator: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return {
        session: UserInterfaceSessionSchema.parse({
          isAdmin: false,
          assignedUnprocessedMessages: 0,
        }),
      };
    }

    return {
      session: UserInterfaceSessionSchema.parse({
        isAdmin: !!user.Admin,
      }),
    };
  }),
  getLiveChatSettings: privateProcedure.input(GetLiveChatSettingsSchema).query(async ({ ctx, input }) => {
    const user = await prisma.user.findUnique({
      where: {
        id: ctx.user.id,
      },
      include: {
        LiveChatSettings: true,
      },
    });

    let settings: LiveChatSettings;
    if (!user) {
      throw userNotFoundError;
    } else if (!user.LiveChatSettings) {
      // It has never been initialized, so we do it
      settings = await prisma.liveChatSettings.create({
        data: {
          sessionToken: uuidv4(),
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });
    } else {
      settings = user.LiveChatSettings;
    }

    return {
      settings: LiveChatSettingsSchema.parse({
        userId: user.id,
        email: user.email,
        emailSignature: signEmail(user.email),
        firstname: user.firstname,
        lastname: user.lastname,
        sessionToken: settings.sessionToken,
      }),
    };
  }),
});
