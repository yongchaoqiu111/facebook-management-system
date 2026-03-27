import fs from 'fs';
import path from 'path';
import { config } from './config';
import { PersonaProfile, defaultPersona } from './content-strategy';

function safeRead(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function normalizeLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function parseCommaList(value: string): string[] {
  return value
    .split(/[，,]/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export function getFollowKeywordsFromText(): string[] {
  const filePath = path.resolve(process.cwd(), config.weibo.follow.keywordFilePath);
  const raw = safeRead(filePath);
  if (!raw) {
    return ['openclaw'];
  }

  const keywords = normalizeLines(raw);
  return keywords.length > 0 ? keywords : ['openclaw'];
}

export function getPersonaFromText(): PersonaProfile {
  const filePath = path.resolve(process.cwd(), config.weibo.persona.profileFilePath);
  const raw = safeRead(filePath);
  if (!raw) {
    return defaultPersona;
  }

  const lines = normalizeLines(raw);
  const map = new Map<string, string>();

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!value) {
      continue;
    }
    map.set(key, value);
  }

  const role = map.get('role') || map.get('角色') || defaultPersona.role;
  const focus = map.get('focus') || map.get('定位') || defaultPersona.focus;
  const audience = map.get('audience') || map.get('受众') || defaultPersona.audience;
  const toneRaw = map.get('tone') || map.get('语气') || defaultPersona.tone;
  const tone: PersonaProfile['tone'] = toneRaw === '专业' || toneRaw === '严谨' || toneRaw === '轻松'
    ? toneRaw
    : defaultPersona.tone;

  const workflowsRaw = map.get('workflows') || map.get('工作流') || defaultPersona.currentWorkflows.join(',');
  const currentWorkflows = parseCommaList(workflowsRaw);

  return {
    role,
    focus,
    currentWorkflows: currentWorkflows.length > 0 ? currentWorkflows : defaultPersona.currentWorkflows,
    audience,
    tone
  };
}
