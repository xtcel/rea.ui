import type { InspectedPage } from '@rea/design';
import type { AgentRef } from './sessions';

/** Canvas-side capabilities handed to the AI panel by the editor. */
export interface AgentCanvasContext {
  page: InspectedPage;
  selectedIds: readonly string[];
  refs: readonly AgentRef[];
  addRefs(refs: readonly AgentRef[]): void;
  removeRef(pageId: string, designId: string): void;
  /** Flip between "this node only" and "this node and its children". */
  toggleSubtree(pageId: string, designId: string): void;
  clearRefs(): void;
  focus(designId: string): void;
  /** Briefly outline nodes the Agent just changed. */
  markTouched(ids: readonly string[]): void;
}
