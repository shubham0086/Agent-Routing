/**
 * Token optimizer for prompt compression and cost savings.
 * Ported from production AIOps utils/token_optimizer.py.
 *
 * Extracted from Agency OS / AIOps production pipeline.
 */

export class TokenOptimizer {
  constructor() {
    this.optimizationRules = [
      [/\s+/g, ' '],
      [/\b(very|quite|rather|somewhat|pretty)\s+/gi, ''],
      [/in order to/gi, 'to'],
      [/due to the fact that/gi, 'because'],
      [/a lot of/gi, 'many'],
      [/at this point in time/gi, 'now'],
      [/\b(basically|essentially|actually|literally)\s+/gi, ''],
    ];
  }

  optimizePrompt(prompt) {
    if (!prompt) return '';
    try {
      let optimized = prompt.trim();
      for (const [pattern, replacement] of this.optimizationRules) {
        optimized = optimized.replace(pattern, replacement);
      }
      return optimized.replace(/\s+/g, ' ').trim();
    } catch (_) {
      return prompt;
    }
  }

  estimateTokens(text) {
    return Math.floor((text || '').length / 4);
  }
}
