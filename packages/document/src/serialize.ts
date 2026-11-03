import { Children, isValidElement } from 'react';
import type { ReactElement } from 'react';
import { getNodeKind } from '@rea/design';
export function sourceLiteral(value:unknown):string{
  let count=0;function check(v:unknown,depth:number){if(++count>100000||depth>32)throw new Error('静态值过大或嵌套过深。');if(typeof v==='number'&&!Number.isFinite(v)||['function','symbol','bigint'].includes(typeof v))throw new Error('属性需要可序列化的有限静态值。');if(v&&typeof v==='object'){if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw new Error('属性仅支持普通静态对象。');for(const [key,item]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))throw new Error('静态对象键无效。');check(item,depth+1);}}}check(value,0);return JSON.stringify(value);
}
export function sourceElement(kind: string, props: Record<string, unknown>, children?: string): string {
  const attributes = Object.entries(props).filter(([key,value]) => key !== 'children' && value !== undefined).map(([key,value]) => `${key}={${sourceLiteral(value)}}`).join(' ');
  return children === undefined ? `<${kind} ${attributes} />` : `<${kind} ${attributes}>${children}</${kind}>`;
}
export function serializeElement(element: ReactElement): string {
  const props = element.props as Record<string, unknown>;
  const children = Children.toArray(props.children as never).map(child => typeof child === 'string' ? `{${JSON.stringify(child)}}` : isValidElement(child) ? serializeElement(child) : '').join('\n');
  return sourceElement(getNodeKind(element)!, props, children || undefined);
}
