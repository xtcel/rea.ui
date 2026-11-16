import { systemSnapshot } from '../agent/designSystem';
import type { DesignSystem } from '../agent/designSystem';

export interface SystemMenuChoice {
  id: string;
  name: string;
  description: string;
  color: string;
  badge: string;
  active: boolean;
  disabled: boolean;
  hint?: string;
}

export interface SystemMenuModel {
  editAction?: { label: string };
  listLabel: string;
  choices: SystemMenuChoice[];
  browseAction?: { label: string };
  createAction?: { label: string };
  clearAction?: { label: string; disabled: boolean; hint?: string };
}

export interface BuildSystemMenuOptions {
  systems: readonly DesignSystem[];
  pinned: boolean;
  selectedSystem?: string;
  selectedSystemHash?: string;
  canBrowse?: boolean;
  canClear?: boolean;
  tokenReferenceCount?: number;
}

function trySnapshot(system: DesignSystem) {
  try { return systemSnapshot(system); }
  catch { return null; }
}

/** Build the menu entries for the editor AI composer's design-system picker. */
export function buildSystemMenuModel(options: BuildSystemMenuOptions): SystemMenuModel {
  const { systems, pinned, selectedSystem, selectedSystemHash, canBrowse = false, canClear = false, tokenReferenceCount = 0 } = options;
  const choices: SystemMenuChoice[] = systems.map(system => {
    const snapshot = trySnapshot(system);
    const active = !!pinned && !!snapshot && (selectedSystemHash ? snapshot.pkg.hash === selectedSystemHash : system.id === selectedSystem);
    const name = system.name.trim() || '未命名设计系统';
    const badge = !snapshot
      ? '待修正'
      : active
        ? '当前'
        : snapshot.ref.draft
          ? '草稿'
          : `v${snapshot.ref.revision}`;
    const hint = !snapshot
      ? '令牌不完整，请先在首页「设计系统」中修正后再使用'
      : system.description || name;
    return {
      id: system.id,
      name,
      description: system.description,
      color: snapshot?.pkg.tokens.color.primary || system.color || '',
      badge,
      active,
      disabled: !snapshot,
      hint,
    };
  });

  if (!pinned) {
    return {
      listLabel: '选择已有设计系统',
      choices,
      browseAction: canBrowse ? { label: '从更多版本中选择…' } : undefined,
      createAction: { label: '使用 AI 会话创建设计系统…' },
    };
  }

  const clearBlocked = tokenReferenceCount > 0;
  return {
    editAction: { label: '编辑 / 用 AI 调整当前设计系统…' },
    listLabel: '切换已有设计系统',
    choices,
    browseAction: canBrowse ? { label: '从更多版本中选择…' } : undefined,
    clearAction: canClear
      ? {
          label: '取消固定设计系统',
          disabled: clearBlocked,
          hint: clearBlocked ? `正被 ${tokenReferenceCount} 处引用` : undefined,
        }
      : undefined,
  };
}
