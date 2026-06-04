# Agent-Routing

**Your agent keeps working when OpenAI goes down, your quota runs out, or a model gets deprecated.**

Agent-Routing is a multi-provider LLM router with per-task fallback chains, session-level circuit breakers, token optimization, and prompt injection guardrails. It routes each request down a priority chain until one succeeds, and marks failed providers down for the rest of the session.

Extracted from 18 months of production Agency OS.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/Node-18%2B-brightgreen.svg)](package.json)
[![Runs offline](https://img.shields.io/badge/runs-offline%20with%20Ollama-orange.svg)]()

---

## Quick Start

```bash
git clone https://github.com/shubham0086/Agent-Routing
cd Agent-Routing
node demo/failover.js   # See the router cascade through providers
```

No install needed. Demo runs in mock mode without any API keys.

---

## What It Does

### 1. Fallback Chains Per Task Class

Each task type routes through a different priority chain:

```
code:    openai -> gemini -> anthropic -> ollama
content: gemini -> openai -> anthropic -> ollama
ui:      gemini -> openai -> ollama
simple:  openai -> gemini -> ollama
```

No API key? Provider skipped. All cloud providers down? Ollama runs locally. The agent never stops.

### 2. Session Circuit Breaker

A provider that fails all its models gets marked `OPEN` for the session. No more wasted calls:

```
CIRCUIT OPENED: openai failed all models and is marked down for this session.
```

### 3. Budget-Aware Routing

```js
await router.chat(prompt, system, 'code', 0.3, 4096, budget: 0.001)
// Only routes to models whose estimated cost fits within $0.001
```

### 4. Token Optimization

Prompts are compressed before sending: filler words and phrases removed, whitespace collapsed. Typical savings: 10-20% on verbose prompts.

### 5. Guardrails

Input is checked for prompt injection. Output is scanned and secrets (API keys, JWTs, DB connection strings) are redacted before returning.

---

## API

### `new Router(keys, ollamaUrl, defaultProvider)`

```js
import { Router } from 'agent-routing';

const router = new Router({
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY
});
```

No keys provided? Router defaults to Ollama automatically.

### `router.chat(prompt, systemPrompt, taskClass, temperature, maxTokens, budget)`

```js
const result = await router.chat(
  'Write a sorting algorithm',
  'You are a senior engineer',
  'code'   // picks the code fallback chain
);

console.log(result.provider);  // which provider answered
console.log(result.model);     // which model answered
console.log(result.cost);      // USD cost of the call
console.log(result.latency);   // seconds
console.log(result.content);   // the response
```

### `CircuitBreaker`

```js
import { CircuitBreaker } from 'agent-routing';

const breaker = new CircuitBreaker(3, 60); // open after 3 failures, recover after 60s
const result = await breaker.call(myApiCall, ...args);
```

States: `CLOSED` (normal) -> `OPEN` (rejecting) -> `HALF_OPEN` (testing recovery) -> `CLOSED`

### `RetryWithBackoff`

```js
import { RetryWithBackoff } from 'agent-routing';

const retrier = new RetryWithBackoff(3, 1.0); // 3 retries, 1s base delay (doubles each time)
const result = await retrier.execute(myFlakeyCall);
```

---

## Providers Supported

| Provider | Models | Key env var |
|----------|--------|-------------|
| OpenAI | gpt-4o-mini, gpt-4o | `OPENAI_API_KEY` |
| Anthropic | claude-3-5-haiku, claude-3-5-sonnet | `ANTHROPIC_API_KEY` |
| Gemini | gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro | `GEMINI_API_KEY` |
| Ollama | qwen2.5-coder:7b (any local model) | none (free, local) |

---

## Where This Fits

```
AI-systems-evolution   ← rung 03 (agent needs reliable LLM calls)
    |
    └─► agentic-patterns  ← Pattern 02: multi-provider routing theory
            |
            └─► Agent-Routing  ← THIS REPO (runnable production router)
```

For the full production stack: see **agentkernel**.

---

<div align="center">

Built by [Shubham Prajapati](https://github.com/shubham0086) ·
[Portfolio](https://shubham0086.github.io/MyPortfolio.github.io/)
· MIT

Extracted from 18 months of production Agency OS.

</div>
