import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { BRAIN_DIR } from '../utils/paths.js';
import { getRegisteredProjects } from '../utils/registry.js';
import { extractSection } from '../utils/parser.js';

const MEMORY_SECTIONS = ['Core', 'Architecture', 'Decisions', 'Conventions', 'User Profile', 'Important Context'];

interface SearchMatch {
  projectPath: string;
  file: string;
  section: string;
  lines: string[];
}

function searchFile(filePath: string, pattern: RegExp, sectionFilter?: string): Array<{ section: string; lines: string[] }> {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf8');
  const results: Array<{ section: string; lines: string[] }> = [];

  // Search within named sections for MEMORY.md
  const filename = filePath.split('/').pop() ?? '';
  if (filename === 'MEMORY.md') {
    for (const section of MEMORY_SECTIONS) {
      if (sectionFilter && section.toLowerCase() !== sectionFilter.toLowerCase()) continue;
      const sectionContent = extractSection(content, section);
      const matchingLines = sectionContent
        .split('\n')
        .filter(l => {
          const t = l.trim();
          return t.length > 0 && !t.startsWith('<!--') && !t.startsWith('#') && t !== '---' && pattern.test(l);
        })
        .map(l => l.trim())
        .slice(0, 3);
      if (matchingLines.length > 0) {
        results.push({ section, lines: matchingLines });
      }
    }
    return results;
  }

  // For other files (LOG.md, SESSION.md) — flat line search
  const matchingLines = content
    .split('\n')
    .filter(l => pattern.test(l))
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 3);
  if (matchingLines.length > 0) {
    results.push({ section: 'Log', lines: matchingLines });
  }
  return results;
}

export const searchCommand = new Command('search')
  .description('Search across all project memories')
  .argument('<query>', 'Text or pattern to search for')
  .option('--project <name>', 'Limit search to a specific project path (partial match)')
  .option('--section <name>', 'Limit search to a specific MEMORY.md section (e.g. decisions, architecture)')
  .option('--log', 'Also search session logs (LOG.md)')
  .addHelpText('after', `
Examples:
  mindlink search "postgres"
  mindlink search "auth" --section decisions
  mindlink search "stripe" --project myapp
  mindlink search "api key" --log
  `)
  .action((query: string, opts) => {
    const cwd = resolve(process.cwd());

    // Build project list: registered projects + cwd if it has .brain/
    const registered = getRegisteredProjects().filter(p => existsSync(join(p, BRAIN_DIR, 'config.json')));
    const projects = registered.includes(cwd)
      ? registered
      : existsSync(join(cwd, BRAIN_DIR, 'config.json'))
        ? [cwd, ...registered]
        : registered;

    if (projects.length === 0) {
      console.log('');
      console.log(`  ${chalk.dim('No MindLink projects found.')}`);
      console.log(`  Run ${chalk.cyan('mindlink init')} in a project directory first.`);
      console.log('');
      process.exit(0);
    }

    // Apply project filter
    const filteredProjects = opts.project
      ? projects.filter(p => p.toLowerCase().includes(opts.project.toLowerCase()))
      : projects;

    if (filteredProjects.length === 0) {
      console.log('');
      console.log(`  ${chalk.dim(`No projects matching "${opts.project}"`)}`);
      console.log('');
      process.exit(0);
    }

    // Build regex — case insensitive, escape special chars
    let pattern: RegExp;
    try {
      pattern = new RegExp(query, 'i');
    } catch {
      // Invalid regex — fall back to literal string search
      pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const matches: SearchMatch[] = [];

    for (const projectPath of filteredProjects) {
      const brainDir = join(projectPath, BRAIN_DIR);
      if (!existsSync(brainDir)) continue;

      // Always search MEMORY.md
      const memoryMatches = searchFile(join(brainDir, 'MEMORY.md'), pattern, opts.section);
      for (const m of memoryMatches) {
        matches.push({ projectPath, file: 'MEMORY.md', section: m.section, lines: m.lines });
      }

      // Optionally search LOG.md
      if (opts.log) {
        const logMatches = searchFile(join(brainDir, 'LOG.md'), pattern, undefined);
        for (const m of logMatches) {
          matches.push({ projectPath, file: 'LOG.md', section: m.section, lines: m.lines });
        }
      }
    }

    console.log('');

    if (matches.length === 0) {
      console.log(`  ${chalk.dim(`No matches for "${query}"`)}`);
      if (!opts.log) {
        console.log(`  ${chalk.dim('Add --log to also search session history.')}`);
      }
      console.log('');
      process.exit(0);
    }

    // Group by project
    const byProject: Record<string, SearchMatch[]> = {};
    for (const m of matches) {
      if (!byProject[m.projectPath]) byProject[m.projectPath] = [];
      byProject[m.projectPath].push(m);
    }

    const totalProjects = Object.keys(byProject).length;
    console.log(`  ${chalk.bold(`Found in ${totalProjects} project${totalProjects !== 1 ? 's' : ''}:`)}  ${chalk.dim(`"${query}"`)}`);
    console.log('');

    for (const [projectPath, projectMatches] of Object.entries(byProject)) {
      // Show project name (last path segment) + full path dimmed
      const parts = projectPath.split('/');
      const projectName = parts[parts.length - 1] ?? projectPath;
      console.log(`  ${chalk.bold(projectName)}  ${chalk.dim(projectPath)}`);

      for (const m of projectMatches) {
        console.log(`    ${chalk.cyan(m.file)} ${chalk.dim('→')} ${chalk.cyan(m.section)}`);
        for (const line of m.lines) {
          // Highlight the matching part
          const highlighted = line.replace(pattern, (match) => chalk.yellow(match));
          console.log(`      ${chalk.dim('·')} ${highlighted}`);
        }
      }
      console.log('');
    }
  });
