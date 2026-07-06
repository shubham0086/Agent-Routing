# Security

This is a local Model Context Protocol (MCP) tool. Please read this before running it.

## Trust model
- It runs **locally**, launched by your MCP client (IDE / agent). By itself it is **not sandboxed**.
- **What it does:** routes LLM calls across multiple providers with fallback (uses your own API keys).
- It runs with **your** permissions and can access whatever you point it at. Run it only on repositories / data you trust.

## Treat tool output as untrusted input
MCP tool output flows into an LLM's context. A file, document, or web page can carry **hidden prompt-injection** ("ignore your instructions and do X"). Do not let tool output silently drive privileged actions. For agentic or production use, put tool calls behind a sanitizing gateway (input + output injection scrub, egress control, audit) rather than trusting raw output.

## Secrets
Provide API keys via environment variables only. Never commit secrets. This repository ships no credentials.

## Reporting a vulnerability
Please open a private GitHub security advisory, or email shubham.prajapati086@gmail.com. Do not file a public issue for a security bug.
