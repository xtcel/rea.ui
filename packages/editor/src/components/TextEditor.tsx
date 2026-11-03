import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { readTextSizing } from '@rea/tailwind';
import type { Rect } from '@rea/geometry';
import { TextEditingSession } from '../session/textEditing';
export function TextEditor({ id, text, target, box, rotation, onFinish }: {
    id: string;
    text: string;
    target: HTMLElement;
    box: Rect;
    rotation: number;
    onFinish: (text: string | null) => void;
}) {
    const editor = useRef<HTMLDivElement>(null), session = useRef(new TextEditingSession()), finished = useRef(false);
    const computed = getComputedStyle(target);
    const style: CSSProperties = { position: 'absolute', left: box.x, top: box.y, width: readTextSizing(target.className) === 'auto-width' ? 'max-content' : box.width, minWidth: 4, minHeight: 4, height: readTextSizing(target.className) === 'fixed' ? box.height : 'auto',
        transform: `rotate(${rotation}deg)`, transformOrigin: 'center', fontFamily: computed.fontFamily, fontSize: computed.fontSize, fontWeight: computed.fontWeight, fontStyle: computed.fontStyle, lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing, textAlign: computed.textAlign as CSSProperties['textAlign'], textDecoration: computed.textDecoration, textTransform: computed.textTransform as CSSProperties['textTransform'], color: computed.color, whiteSpace: computed.whiteSpace as CSSProperties['whiteSpace'], padding: computed.padding, boxSizing: computed.boxSizing as CSSProperties['boxSizing'], overflowWrap: 'break-word', userSelect: 'text' };
    function finish(cancel = false) { if (finished.current || session.current.composing)
        return; finished.current = true; onFinish(cancel ? null : editor.current!.innerText.replace(/\r/g, '')); }
    useLayoutEffect(() => {
        const element = editor.current!;
        element.textContent = text;
        element.focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, [id]);
    return <div ref={editor} className="rea-text-editor" data-text-editing={id} role="textbox" aria-label="编辑文字" aria-multiline="true" contentEditable="plaintext-only" suppressContentEditableWarning style={style} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onCompositionStart={() => session.current.compositionStart()} onCompositionEnd={() => { if (session.current.compositionEnd())
        finish(); }} onBlur={() => { if (session.current.blur())
        finish(); }} onKeyDown={event => { event.stopPropagation(); const action = session.current.key(event.key, event.metaKey || event.ctrlKey, event.nativeEvent.isComposing || event.keyCode === 229); if (action) {
        event.preventDefault();
        finish(action === 'cancel');
    } }} onPaste={event => { event.preventDefault(); event.stopPropagation(); const selection = window.getSelection(); if (!selection?.rangeCount)
        return; const range = selection.getRangeAt(0); range.deleteContents(); const node = document.createTextNode(event.clipboardData.getData('text/plain')); range.insertNode(node); range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); }}/>;
}
