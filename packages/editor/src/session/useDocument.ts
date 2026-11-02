import { useEffect, useRef, useState } from 'react';
import { applyOperation, commitSource, parseDocument, redoSource, undoSource } from '@rea/document';
import type { HistoryState, SourceOperation } from '@rea/document';

const STORAGE_KEY = 'rea-ui:tsx-document:v1';
export function useDocument(initialSource: string) {
  const [state, setState] = useState<HistoryState>(() => {
    let code = initialSource;
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { parseDocument(saved); code = saved; } } catch { /* Bundled document remains available. */ }
    return { current: parseDocument(code), past: [], future: [] };
  });
  const latest = useRef(state);
  const [notice, setNotice] = useState('');
  const [saveState, setSaveState] = useState('');
  function publish(next: HistoryState) { latest.current = next; setState(next); setNotice(''); }
  function execute(operation: SourceOperation) {
    try { publish(commitSource(latest.current, applyOperation(latest.current.current.code, operation))); return true; }
    catch (error) { setNotice(error instanceof Error ? error.message : String(error)); return false; }
  }
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, state.current.code); setSaveState('已保存到此浏览器'); }
    catch { setSaveState('尚未保存，请导出 TSX'); }
  }, [state.current.code]);
  return { ...state, execute, notice, setNotice, saveState,
    undo: () => publish(undoSource(latest.current)), redo: () => publish(redoSource(latest.current)) };
}
