import { Command } from 'commander';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('brainlink')
  .description('Give your AI a permanent memory.')
  .version('0.1.0', '-v, --version');

program.addCommand(initCommand);

// Coming soon:
// program.addCommand(statusCommand);
// program.addCommand(syncCommand);
// program.addCommand(logCommand);
// program.addCommand(configCommand);
// program.addCommand(clearCommand);
// program.addCommand(updateCommand);

program.parse();
