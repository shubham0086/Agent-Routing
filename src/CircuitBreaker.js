/**
 * Circuit Breaker pattern and Exponential Retry.
 * Wraps any async operation with failure counting, OPEN/CLOSED/HALF_OPEN states,
 * and retry-with-backoff.
 *
 * Extracted from Agency OS / AIOps production pipeline.
 */

export class CircuitBreaker {
  /**
   * @param {number} failureThreshold - Failures before OPEN (default: 3)
   * @param {number} recoveryTimeout - Seconds before trying again from OPEN (default: 60)
   */
  constructor(failureThreshold = 3, recoveryTimeout = 60, expectedException = Error) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.expectedException = expectedException;

    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async call(func, ...args) {
    if (this.state === 'OPEN') {
      if (this._shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker OPEN - too many failures. Retry after ${this.recoveryTimeout}s`);
      }
    }

    try {
      const result = await func(...args);
      this._onSuccess();
      return result;
    } catch (e) {
      if (e instanceof this.expectedException) this._onFailure();
      throw e;
    }
  }

  getState() {
    return this.state;
  }

  _shouldAttemptReset() {
    return this.lastFailureTime && (Date.now() - this.lastFailureTime) / 1000 > this.recoveryTimeout;
  }

  _onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  _onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker] OPEN after ${this.failureCount} consecutive failures.`);
    }
  }
}

export class RetryWithBackoff {
  /**
   * @param {number} maxRetries - Max retry attempts (default: 3)
   * @param {number} baseDelay - Base delay in seconds (default: 1.0)
   */
  constructor(maxRetries = 3, baseDelay = 1.0) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async execute(func, ...args) {
    let lastError = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await func(...args);
      } catch (e) {
        lastError = e;
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.warn(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${delay.toFixed(1)}s. Error: ${e.message}`);
          await new Promise(r => setTimeout(r, delay * 1000));
        } else {
          console.error(`[Retry] All ${this.maxRetries + 1} attempts exhausted.`);
        }
      }
    }
    throw lastError;
  }
}

// Per-provider circuit breaker registry
const PROVIDER_BREAKERS = new Map();

export function getProviderBreaker(providerName) {
  if (!PROVIDER_BREAKERS.has(providerName)) {
    PROVIDER_BREAKERS.set(providerName, new CircuitBreaker(3, 60));
  }
  return PROVIDER_BREAKERS.get(providerName);
}

export async function safeProviderCall(providerName, func, ...args) {
  const breaker = getProviderBreaker(providerName);
  try {
    return await breaker.call(func, ...args);
  } catch (e) {
    console.error(`[CircuitBreaker] ${providerName} call failed: ${e.message}`);
    throw e;
  }
}
