import { Command } from '@commander-js/extra-typings';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { program } from '@ad/src/cli/program';
import { unexpectedCliMaintenanceCommandError } from '@ad/src/models/entities/errors';
import { apiHandlerWrapper } from '@ad/src/utils/api';
import { assertMaintenanceOperationAuthenticated } from '@ad/src/utils/maintenance';

export const HandlerBodySchema = z
  .object({
    command: z.string().min(1).max(1000),
  })
  .strict();
export type HandlerBodySchemaType = z.infer<typeof HandlerBodySchema>;

const commandsPrefixesWhitelist: string[] = [];

// This endpoint allows running cron job commands (that are defined in the CLI) without connecting to the host (note also it would imply from us to make another build in addition to the Next.js build)
// (it avoids maintaining 2 implementations when changing parameters and so on)
export async function handler(req: NextApiRequest, res: NextApiResponse) {
  assertMaintenanceOperationAuthenticated(req);

  const body = HandlerBodySchema.parse(req.body);

  // It could be risky to expose the whole CLI due to future implementations, so whitelisting commands we allow
  // Note: `commander.js` was not made to reuse easily subcommands to create another program, so we hack a bit we filter based on raw strings
  if (!commandsPrefixesWhitelist.some((commandPrefix) => body.command.startsWith(commandPrefix))) {
    throw unexpectedCliMaintenanceCommandError;
  }

  // [WORKAROUND] We cannot check if it matches a command or not, in case none it terminates the running process
  // We can add a catcher but we cannot custom the response since global to the instance... so using a clone to wait for it
  let commandFound = true;

  const cloneProgram = new Command();
  for (const command of program.commands) {
    cloneProgram.addCommand(command);
  }

  cloneProgram.on('command:*', () => {
    commandFound = false;
  });

  await cloneProgram.parseAsync(body.command.split(' '), { from: 'user' });

  if (!commandFound) {
    throw unexpectedCliMaintenanceCommandError;
  }

  res.send(`the following command has been executed with success:\n${body.command}`);
}

export default apiHandlerWrapper(handler, {
  restrictMethods: ['POST'],
});
