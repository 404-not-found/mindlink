import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { logCommand } from './commands/log.js';
import { clearCommand } from './commands/clear.js';
import { resetCommand } from './commands/reset.js';

const program = new Command();

program
  .name('brainlink')
  .description('Give your AI a permanent memory.')
  .version('0.1.0', '-v, --version');

program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(logCommand);
program.addCommand(clearCommand);
program.addCommand(resetCommand);

// Coming soon:
// program.addCommand(syncCommand);
// program.addCommand(configCommand);
// program.addCommand(updateCommand);

program.parse();
