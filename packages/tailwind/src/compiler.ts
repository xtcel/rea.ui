import { compile } from 'tailwindcss';
import theme from 'tailwindcss/theme.css?raw';
import preflight from 'tailwindcss/preflight.css?raw';
import { splitClassNames } from './parser';
import { filterCandidates } from './filter';
import type { StyleDiagnostic } from './filter';

export interface CompiledStyles { css: string; diagnostics: StyleDiagnostic[] }
export function collectCandidates(classNames: Iterable<string>): string[] {
  return [...new Set([...classNames].flatMap(splitClassNames))];
}
export class TailwindCompiler {
  private compiler = compile(`@layer theme, base, components, utilities;\n@layer theme { ${theme} }\n@layer base { ${preflight} }\n@tailwind utilities;`);
  private known = new Set<string>();
  private css = '';
  private queue: Promise<unknown> = Promise.resolve();
  build(classNames: Iterable<string>): Promise<CompiledStyles> {
    const result = filterCandidates(collectCandidates(classNames));
    const run = this.queue.then(async () => {
      const compiler = await this.compiler;
      const added = result.candidates.filter(candidate => !this.known.has(candidate));
      if (added.length || !this.css) {
        this.css = compiler.build(added);
        added.forEach(candidate => this.known.add(candidate));
      }
      return { css: this.css, diagnostics: result.diagnostics };
    });
    this.queue = run.catch(() => {});
    return run;
  }
}
