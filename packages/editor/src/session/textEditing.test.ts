import { expect, it } from 'vitest';
import { TextEditingSession } from './textEditing';
it('leaves IME Enter and Escape alone and defers blur until composition ends',()=>{
  const session=new TextEditingSession();session.compositionStart();expect(session.key('Enter',true)).toBeUndefined();expect(session.key('Escape',false)).toBeUndefined();expect(session.blur()).toBe(false);expect(session.compositionEnd()).toBe(true);
});
it('keeps plain Enter as a newline, commits command Enter and cancels Escape',()=>{
  const session=new TextEditingSession();expect(session.key('Enter',false)).toBeUndefined();expect(session.key('Enter',true)).toBe('commit');expect(session.key('Escape',false)).toBe('cancel');expect(session.key('Escape',false,true)).toBeUndefined();expect(session.blur()).toBe(true);
});
