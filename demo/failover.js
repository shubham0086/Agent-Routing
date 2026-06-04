#!/usr/bin/env node
/**
 * Demo: Multi-provider failover.
 * Forces primary providers to fail, watches traffic cascade to fallback.
 * Runs fully in mock mode — no API keys needed.
 */

import { Router, resetCircuitBreakers } from '../src/Router.js';

console.log('\nAgent-Routing: Failover Demo\n');
console.log('Scenario: No API keys configured. Router should cascade to Ollama.\n');

resetCircuitBreakers();

// No keys — only Ollama (local) is available
const router = new Router({}, 'http://localhost:11434', 'ollama');

// Override _callOllama to mock the response so demo runs without Ollama installed
router._callOllama = async (signal, model, prompt) => {
  await new Promise(r => setTimeout(r, 80));
  return {
    content: `[MOCK Ollama ${model}] Response to: "${prompt.slice(0, 50)}..."`,
    inputTokens: Math.floor(prompt.length / 4),
    outputTokens: 20
  };
};

console.log('Step 1: Routing a "code" task (chain: openai -> gemini -> anthropic -> ollama)');
console.log('  No OpenAI key -> skip');
console.log('  No Gemini key -> skip');
console.log('  No Anthropic key -> skip');
console.log('  Ollama always available -> route here\n');

try {
  const result = await router.chat(
    'Write a function that reverses a string.',
    'You are a senior JavaScript developer.',
    'code'
  );
  console.log(`✓ Response from: ${result.provider.toUpperCase()} (${result.model})`);
  console.log(`  Latency: ${result.latency.toFixed(2)}s`);
  console.log(`  Cost: $${result.cost.toFixed(6)}`);
  console.log(`  Content: ${result.content}\n`);
} catch (e) {
  console.log(`Note: Ollama not running locally. In production this would serve from local Ollama.\nError: ${e.message}\n`);
}

console.log('Step 2: Demonstrating circuit breaker behavior\n');

import { CircuitBreaker } from '../src/CircuitBreaker.js';

const breaker = new CircuitBreaker(2, 5); // open after 2 failures, reset after 5s
let callCount = 0;

const flakyService = async () => {
  callCount++;
  if (callCount <= 2) throw new Error('Service temporarily unavailable');
  return 'Service recovered!';
};

console.log('  Calling flaky service (fails first 2 times, then recovers)...\n');

for (let i = 1; i <= 4; i++) {
  try {
    const result = await breaker.call(flakyService);
    console.log(`  Call ${i}: ✓ SUCCESS - "${result}" [state: ${breaker.getState()}]`);
  } catch (e) {
    console.log(`  Call ${i}: ✗ FAILED  - "${e.message}" [state: ${breaker.getState()}]`);
  }
}

console.log('\nDemo complete.\n');
