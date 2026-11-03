/** A bounded recursive-descent parser. No executable JavaScript is accepted. */
export function evaluateExpression(source: string, current = 0): number | undefined {
  if (!source.trim() || source.length > 512 || !/^[\d\s.+*/()%\-]+$/.test(source)) return;
  let i=0,depth=0;
  const space=()=>{while(/\s/.test(source[i]??'') && i<source.length)i++;};
  function factor():number {
    space(); if(++depth>32) throw new Error(); let n:number;
    if(source[i]==='+' || source[i]==='-') {const sign=source[i++];n=(sign==='-'?-1:1)*factor();}
    else if(source[i]==='('){i++;n=sum();space();if(source[i++]!==')')throw new Error();}
    else {const m=source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(!m)throw new Error();i+=m[0].length;n=Number(m[0]);}
    space();if(source[i]==='%'){i++;n=n*current/100;} depth--;if(!Number.isFinite(n))throw new Error();return n;
  }
  function product():number {let n=factor();space();while(source[i]==='*'||source[i]==='/'){const op=source[i++],r=factor();if(op==='/'&&r===0)throw new Error();n=op==='*'?n*r:n/r;space();}return n;}
  function sum():number {let n=product();space();while(source[i]==='+'||source[i]==='-'){const op=source[i++],r=product();n=op==='+'?n+r:n-r;space();}return n;}
  try {const n=sum();space();return i===source.length && Number.isFinite(n)?Math.round(n*1e6)/1e6:undefined;}catch{return;}
}
export function stepAmount(modifiers:{shiftKey:boolean;altKey:boolean}) {return modifiers.shiftKey?10:modifiers.altKey?.1:1;}
export function addRecentColor(colors:readonly string[],color:string) {return [color.toUpperCase(),...colors.filter(c=>c.toUpperCase()!==color.toUpperCase())].slice(0,12);}
