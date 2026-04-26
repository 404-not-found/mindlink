import { Command } from 'commander';
import chalk from 'chalk';
import { VERSION } from './utils/version.js';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { logCommand } from './commands/log.js';
import { clearCommand } from './commands/clear.js';
import { resetCommand } from './commands/reset.js';
import { configCommand } from './commands/config.js';
import { syncCommand } from './commands/sync.js';
import { updateCommand } from './commands/update.js';
import { summaryCommand } from './commands/summary.js';
import { uninstallCommand } from './commands/uninstall.js';
import { exportCommand } from './commands/export.js';
import { importCommand } from './commands/import.js';
import { doctorCommand } from './commands/doctor.js';
import { versionCommand } from './commands/version.js';
import { diffCommand } from './commands/diff.js';
import { verifyCommand } from './commands/verify.js';
import { profileCommand } from './commands/profile.js';
import { pruneCommand } from './commands/prune.js';
import { mcpCommand } from './commands/mcp.js';
import { recapCommand } from './commands/recap.js';
import { searchCommand } from './commands/search.js';
import { learnCommand } from './commands/learn.js';

const program = new Command();

program
  .name('mindlink')
  .description('Give your AI a brain.')
  .version(VERSION, '-v, --version');

program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(logCommand);
program.addCommand(clearCommand);
program.addCommand(resetCommand);
program.addCommand(configCommand);
program.addCommand(syncCommand);
program.addCommand(updateCommand);
program.addCommand(summaryCommand);
program.addCommand(uninstallCommand);
program.addCommand(exportCommand);
program.addCommand(importCommand);
program.addCommand(doctorCommand);
program.addCommand(versionCommand);
program.addCommand(diffCommand);
program.addCommand(verifyCommand);
program.addCommand(profileCommand);
program.addCommand(pruneCommand);
program.addCommand(mcpCommand);
program.addCommand(recapCommand);
program.addCommand(searchCommand);
program.addCommand(learnCommand);

// "Did you mean?" on unknown commands
program.on('command:*', (operands: string[]) => {
  const unknown = operands[0];
  const known = ['init', 'status', 'log', 'clear', 'reset', 'config', 'sync', 'update', 'summary', 'uninstall', 'export', 'import', 'doctor', 'version', 'diff', 'verify', 'profile', 'prune', 'mcp', 'recap', 'search', 'learn'];

  // Simple Levenshtein-based suggestion
  function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  const closest = known
    .map(cmd => ({ cmd, dist: levenshtein(unknown, cmd) }))
    .sort((a, b) => a.dist - b.dist)[0];

  console.log('');
  console.log(`  ${chalk.red('✗')}  Unknown command: ${chalk.bold(unknown)}`);
  if (closest && closest.dist <= 3) {
    console.log(`     Did you mean ${chalk.cyan('mindlink ' + closest.cmd)}?`);
  }
  console.log(`     Run ${chalk.cyan('mindlink --help')} to see all commands.`);
  console.log('');
  process.exit(1);
});

program.parse();
