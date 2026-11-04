import type { ReactNode } from 'react';
import { SplitPane, shellWidths, useStoredWidth } from '../ui';
export function EditorShell({ toolbar, left, right, children, panel, onClose, agentActive = false }: { toolbar: ReactNode; left: ReactNode; right: ReactNode; children: ReactNode; panel: 'layers' | 'inspector' | null; onClose: () => void; agentActive?: boolean }) {
  const [layerWidth, setLayerWidth] = useStoredWidth('rea.editor.leftWidth', 240), [agentWidth, setAgentWidth] = useStoredWidth('rea.editor.agentWidth', 360), [rightWidth, setRight] = useStoredWidth('rea.editor.rightWidth', 280);
  const leftWidth = agentActive ? agentWidth : layerWidth, setLeft = agentActive ? setAgentWidth : setLayerWidth;
  return <div className="rea-shell" style={shellWidths(leftWidth, rightWidth)}><header className="rea-toolbar">{toolbar}</header><main className="rea-workspace" data-panel={panel ?? 'none'}>
    {panel && <button type="button" className="rea-backdrop" aria-label="关闭侧边面板" onClick={onClose} />}
    <div className="rea-left">{left}<SplitPane label="调整左栏宽度" value={leftWidth} onChange={setLeft} className="rea-left-resizer" /></div>
    <div className="relative min-h-0 min-w-0 overflow-hidden">{children}</div>
    <div className="rea-right"><SplitPane label="调整右栏宽度" value={rightWidth} onChange={setRight} reverse className="rea-right-resizer" />{right}</div>
  </main></div>;
}
