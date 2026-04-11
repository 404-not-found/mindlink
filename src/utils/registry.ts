import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const REGISTRY_DIR = join(homedir(), '.mindlink');
const REGISTRY_PATH = join(REGISTRY_DIR, 'projects.json');

function load(): string[] {
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function save(paths: string[]): void {
  mkdirSync(REGISTRY_DIR, { recursive: true });
  writeFileSync(REGISTRY_PATH, JSON.stringify(paths, null, 2));
}

export function registerProject(projectPath: string): void {
  const paths = load();
  if (!paths.includes(projectPath)) {
    paths.push(projectPath);
    save(paths);
  }
}

export function getRegisteredProjects(): string[] {
  return load();
}
