import { SimulationConfig } from '../types';

const STORAGE_KEY = 'interviewcoach_agent_config_v1';

export function defaultAgentConfig(): SimulationConfig {
  return {
    vibe: 'empath',
    jdText: '',
    learningObjective: '',
    questionFocus: 'mixed'
  };
}

export function loadAgentConfig(): SimulationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAgentConfig();
    const parsed = JSON.parse(raw);
    return { ...defaultAgentConfig(), ...parsed };
  } catch {
    return defaultAgentConfig();
  }
}

export function saveAgentConfig(cfg: Partial<SimulationConfig>) {
  const current = loadAgentConfig();
  const next = { ...current, ...cfg };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}


