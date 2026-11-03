import { describe, expect, it } from 'vitest';
import { addRecentColor, evaluateExpression, stepAmount } from './numeric';
describe('property input values',()=>{
  it.each([['100+20',100,120],['50%',200,100],['(10+5)*2/3',0,10],['-.5 + .25',0,-.25],['10+50%',100,60],['2*-3',0,-6]])('evaluates %s',(source,current,result)=>expect(evaluateExpression(source as string,current as number)).toBe(result));
  it.each(['1/0','alert(1)','globalThis.x=1','1e10','2**3','NaN','Infinity','0/0','1;2','1+','()','1/*x*/2','('.repeat(40)+'1'+')'.repeat(40)])('rejects %s',source=>expect(evaluateExpression(source)).toBeUndefined());
  it('applies modifier multipliers',()=>{expect(stepAmount({shiftKey:false,altKey:false})).toBe(1);expect(stepAmount({shiftKey:true,altKey:false})).toBe(10);expect(stepAmount({shiftKey:false,altKey:true})).toBe(.1);});
  it('deduplicates and caps recent colors',()=>{expect(addRecentColor(['#AAAAAA','#bbbbbb'],'#BBBBBB')).toEqual(['#BBBBBB','#AAAAAA']);expect(addRecentColor(Array.from({length:12},(_,i)=>`#${String(i).padStart(6,'0')}`),'#FFFFFF')).toHaveLength(12);});
});
