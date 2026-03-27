export interface PersonaProfile {
  role: string;
  focus: string;
  currentWorkflows: string[];
  audience: string;
  tone: '专业' | '严谨' | '轻松';
}

export interface DailyPromptItem {
  slot: 'morning' | 'noon' | 'evening';
  goal: string;
  prompt: string;
}

export const defaultPersona: PersonaProfile = {
  role: '程序员',
  focus: '专注 AI 与 MCP 服务工程化落地',
  currentWorkflows: [
    'MCP 技能编排与任务调度',
    '微博自动化工作流',
    'AI 文案生成与缓存优化'
  ],
  audience: '关注 AI 自动化与工程实践的开发者',
  tone: '专业'
};

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildDailyPromptPlan(persona: PersonaProfile = defaultPersona, date: Date = new Date()): DailyPromptItem[] {
  const workflows = persona.currentWorkflows.join('、');
  const baseContext = `今天是 ${toYmd(date)}。你的人设是：${persona.role}，${persona.focus}。当前工作重点：${workflows}。受众：${persona.audience}。语气：${persona.tone}。`;

  return [
    {
      slot: 'morning',
      goal: '输出今日方向与洞察',
      prompt: `${baseContext} 请写一条早间微博：总结今天 AI/MCP 方向上的 1 个关键判断，并给出 1 个可执行动作。结尾加一个互动问题。`
    },
    {
      slot: 'noon',
      goal: '展示工作流实践进展',
      prompt: `${baseContext} 请写一条午间微博：结合“微博自动化工作流”或“MCP 技能编排”分享一个真实进展（问题、决策、效果）。内容要具体、可复用。`
    },
    {
      slot: 'evening',
      goal: '复盘与次日预告',
      prompt: `${baseContext} 请写一条晚间微博：复盘今天的工程收获（最多3点），并给出明天要推进的一个小目标。结尾邀请读者留言交流。`
    }
  ];
}

export function buildPersonaPromptForTopic(topic: string, persona: PersonaProfile = defaultPersona): string {
  const workflows = persona.currentWorkflows.join('、');
  return `请按以下人设生成微博文案。人设：${persona.role}；定位：${persona.focus}；当前工作流：${workflows}；受众：${persona.audience}；语气：${persona.tone}。主题：${topic}。要求：结合真实工程经验，避免空话，最后给一个互动问题。`;
}
