/**
 * Bionic Reading Utility for Neurodivergent & ADHD Focus Assistance
 */

export function getBionicWordParts(word: string, strength: number = 0.45): { prefix: string; suffix: string } {
  if (!word) return { prefix: '', suffix: '' };
  
  // Extract leading punctuation, alphanumeric core, and trailing punctuation
  const match = word.match(/^([^\w]*)([\w'-]+)([^\w]*)$/);
  if (!match) return { prefix: word, suffix: '' };

  const [, leadingPunct, coreWord, trailingPunct] = match;
  if (coreWord.length <= 1) {
    return { prefix: leadingPunct + coreWord, suffix: trailingPunct };
  }

  // Calculate bold length (usually 40-50% of word length)
  const boldLen = Math.max(1, Math.ceil(coreWord.length * strength));
  const prefix = leadingPunct + coreWord.slice(0, boldLen);
  const suffix = coreWord.slice(boldLen) + trailingPunct;

  return { prefix, suffix };
}

export function formatBionicText(text: string, strength: number = 0.45): Array<{ prefix: string; suffix: string; space: string }> {
  if (!text) return [];
  const tokens = text.split(/(\s+)/);
  const result: Array<{ prefix: string; suffix: string; space: string }> = [];

  for (let i = 0; i < tokens.length; i += 2) {
    const word = tokens[i] || '';
    const space = tokens[i + 1] || '';
    if (word) {
      const parts = getBionicWordParts(word, strength);
      result.push({ ...parts, space });
    } else if (space) {
      result.push({ prefix: '', suffix: '', space });
    }
  }

  return result;
}
