export interface ClassToken {
  raw: string;
  variants: string[];
  important: boolean;
  negative: boolean;
  utility: string;
  value?: string;
  isArbitraryProperty?: boolean;
}

/**
 * Split a class string into raw class tokens, preserving space delimiters.
 */
export function splitClassNames(className: string): string[] {
  return className.trim().split(/\s+/).filter(Boolean);
}

/**
 * Split variants by ':' taking nested brackets '[...]' into account.
 * E.g. "hover:bg-[#12:34]" -> variants: ["hover"], rest: "bg-[#12:34]"
 */
export function extractVariants(raw: string): { variants: string[]; core: string } {
  const variants: string[] = [];
  let bracketDepth = 0;
  let start = 0;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === ':' && bracketDepth === 0) {
      variants.push(raw.slice(start, i));
      start = i + 1;
    }
  }

  return {
    variants,
    core: raw.slice(start),
  };
}

/**
 * Parse a single class name into structured ClassToken.
 */
export function parseClassToken(raw: string): ClassToken {
  const { variants, core } = extractVariants(raw);

  let important = false;
  let negative = false;
  let remaining = core;

  // Handle leading '!' for important
  if (remaining.endsWith('!')) { important = true; remaining = remaining.slice(0, -1); }
  if (remaining.startsWith('!')) {
    important = true;
    remaining = remaining.slice(1);
  }

  // Handle arbitrary property like [letter-spacing:0.02em] or [color:red]
  if (remaining.startsWith('[') && remaining.endsWith(']')) {
    return {
      raw,
      variants,
      important,
      negative: false,
      utility: remaining,
      value: undefined,
      isArbitraryProperty: true,
    };
  }

  // Handle negative values like -left-4 or -top-[13px]
  if (remaining.startsWith('-')) {
    negative = true;
    remaining = remaining.slice(1);
  }

  // Check common utility prefixes
  const dashIndex = remaining.indexOf('-');
  if (dashIndex === -1) {
    return {
      raw,
      variants,
      important,
      negative,
      utility: remaining,
    };
  }

  // Check prefix combinations (e.g. min-w, max-w, rounded-t, etc.)
  const knownPrefixes = [
    'min-w', 'max-w', 'min-h', 'max-h',
    'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br',
    'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l',
    'rounded-s', 'rounded-e',
    'border-t', 'border-r', 'border-b', 'border-l', 'border-x', 'border-y',
    'outline-offset',
    'inset-x', 'inset-y',
    'gap-x', 'gap-y',
    'overflow-x', 'overflow-y',
    'space-x', 'space-y',
    'backdrop-blur',
  ];

  for (const prefix of knownPrefixes) {
    if (remaining === prefix || remaining.startsWith(prefix + '-')) {
      return {
        raw,
        variants,
        important,
        negative,
        utility: prefix,
        value: remaining === prefix ? undefined : remaining.slice(prefix.length + 1),
      };
    }
  }

  const utility = remaining.slice(0, dashIndex);
  const value = remaining.slice(dashIndex + 1);

  return {
    raw,
    variants,
    important,
    negative,
    utility,
    value,
  };
}

export function parseClassNames(className: string): ClassToken[] {
  return splitClassNames(className).map(parseClassToken);
}

export function formatClassToken(token: ClassToken): string {
  const prefix = token.variants.length ? token.variants.join(':') + ':' : '';
  const imp = token.important ? '!' : '';
  const neg = token.negative ? '-' : '';
  const val = token.value !== undefined ? `-${token.value}` : '';
  return `${prefix}${imp}${neg}${token.utility}${val}`;
}
