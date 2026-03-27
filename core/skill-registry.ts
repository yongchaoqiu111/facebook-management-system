import fs from 'fs';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import type { SkillMetadataContract } from '../standards/contracts';

const MODULE = 'SkillRegistry';
const skillsDir = path.resolve(process.cwd(), 'skills');

/**
 * 技能元数据定义。
 */
export interface SkillMetadata extends SkillMetadataContract {}

const skillMap: Map<string, SkillMetadata> = new Map<string, SkillMetadata>();
const fileToSkillId: Map<string, string> = new Map<string, string>();
let registryWatcher: FSWatcher | null = null;

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

function isSkillFile(filePath: string): boolean {
  return filePath.endsWith('.skill.json');
}

function ensureSkillsDir(): void {
  try {
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] ensureSkillsDir failed:`, error);
  }
}

function parseSkillMetadata(raw: unknown): SkillMetadata | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const data = raw as Partial<SkillMetadata>;
  if (
    typeof data.skillId !== 'string' ||
    typeof data.name !== 'string' ||
    typeof data.version !== 'string' ||
    typeof data.description !== 'string' ||
    typeof data.healthCheckUrl !== 'string' ||
    typeof data.communicationMode !== 'string' ||
    typeof data.timeout !== 'number' ||
    typeof data.inputSchema !== 'object' ||
    data.inputSchema === null ||
    typeof data.outputSchema !== 'object' ||
    data.outputSchema === null
  ) {
    return null;
  }

  const inputSchema = data.inputSchema as SkillMetadata['inputSchema'];
  if (typeof inputSchema.type !== 'string' || typeof inputSchema.properties !== 'object' || inputSchema.properties === null) {
    return null;
  }

  return {
    skillId: data.skillId,
    name: data.name,
    version: data.version,
    description: data.description,
    inputSchema,
    outputSchema: data.outputSchema,
    healthCheckUrl: data.healthCheckUrl,
    communicationMode: data.communicationMode,
    timeout: data.timeout
  };
}

function logAction(action: 'add' | 'change' | 'unlink', filePath: string, skillId: string): void {
  console.log(`[SkillRegistry] ${action} ${filePath} - ${skillId}`);
}

/**
 * 获取所有已注册技能。
 * @returns 技能数组。
 */
export function getAllSkills(): SkillMetadata[] {
  return Array.from(skillMap.values());
}

/**
 * 根据 skillId 获取技能。
 * @param skillId 技能ID。
 * @returns 技能元数据或 undefined。
 */
export function getSkill(skillId: string): SkillMetadata | undefined {
  return skillMap.get(skillId);
}

/**
 * 从文件注册技能。
 * @param filePath 技能文件路径。
 * @returns void
 */
export function registerSkillFromFile(filePath: string): void {
  registerSkillFromFileWithAction(filePath, 'add');
}

function registerSkillFromFileWithAction(filePath: string, action: 'add' | 'change'): void {
  if (!isSkillFile(filePath)) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    const metadata = parseSkillMetadata(parsed);

    if (!metadata) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] invalid skill metadata: ${filePath}`);
      return;
    }

    skillMap.set(metadata.skillId, metadata);
    fileToSkillId.set(filePath, metadata.skillId);
    logAction(action, filePath, metadata.skillId);
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] registerSkillFromFile failed:`, filePath, error);
  }
}

/**
 * 注销技能。
 * @param skillId 技能ID。
 * @returns void
 */
export function unregisterSkill(skillId: string): void {
  skillMap.delete(skillId);
}

function unregisterSkillByFile(filePath: string): void {
  const skillId = fileToSkillId.get(filePath);
  if (!skillId) {
    return;
  }

  unregisterSkill(skillId);
  fileToSkillId.delete(filePath);
  logAction('unlink', filePath, skillId);
}

function scanInitialSkills(): void {
  try {
    // 递归扫描所有子目录中的技能文件
    const scanDir = (dir: string) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          scanDir(fullPath);
        } else if (file.isFile() && file.name.endsWith('.skill.json')) {
          registerSkillFromFile(fullPath);
        }
      }
    };
    scanDir(skillsDir);
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] scanInitialSkills failed:`, error);
  }
}

/**
 * 启动技能目录监听。
 * @returns void
 */
export function startSkillRegistryWatcher(): FSWatcher {
  ensureSkillsDir();
  scanInitialSkills();

  if (registryWatcher) {
    return registryWatcher;
  }

  registryWatcher = chokidar.watch(skillsDir, {
    ignoreInitial: true,
    persistent: true
  });

  registryWatcher.on('add', (filePath: string) => {
    if (!isSkillFile(filePath)) {
      return;
    }
    registerSkillFromFile(filePath);
  });

  registryWatcher.on('change', (filePath: string) => {
    if (!isSkillFile(filePath)) {
      return;
    }
    registerSkillFromFileWithAction(filePath, 'change');
  });

  registryWatcher.on('unlink', (filePath: string) => {
    if (!isSkillFile(filePath)) {
      return;
    }
    unregisterSkillByFile(filePath);
  });

  log('watcher started');
  return registryWatcher;
}
