/** Keep document rem units anchored to the design's 16px root, across CSS zoom boundaries. */
export function designPixelCss(css:string):string{
  return css.replace(/(^|\n)([\t ]*(?:--)?[a-zA-Z-][\w-]*\s*:\s*)([^;\n{}]+)/g,(_line,start:string,property:string,value:string)=>start+property+value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?<![\w-])(-?(?:\d+\.?\d*|\.\d+))rem\b/g,(token:string,number:string|undefined)=>number===undefined?token:`${Number(number)*16}px`));
}
