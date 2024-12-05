import { program } from '@ad/src/cli/program';
import { gracefulExit, registerGracefulExit } from '@ad/src/utils/system';

registerGracefulExit();

// This would break imports from Next.js so isolating it to be run only by CLI
program.parseAsync().catch((error) => {
  gracefulExit(error);
});
