/** IME composition owns Enter/Escape until its text has been committed by the browser. */
export class TextEditingSession {
    composing = false;
    private pendingBlur = false;
    compositionStart() { this.composing = true; }
    compositionEnd(): boolean { this.composing = false; return this.pendingBlur; }
    blur(): boolean { if (this.composing) {
        this.pendingBlur = true;
        return false;
    } return true; }
    key(key: string, command: boolean, nativeComposing = false): 'commit' | 'cancel' | undefined {
        if (this.composing || nativeComposing)
            return;
        if (key === 'Escape')
            return 'cancel';
        if (key === 'Enter' && command)
            return 'commit';
    }
}
