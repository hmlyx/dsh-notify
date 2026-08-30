# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | ✅ |

## Reporting a Vulnerability

This plugin runs inside DeepSeek Harness on the user's local machine. It:

- opens a local HTTP endpoint (`/__notify/*`) reachable only from the same machine;
- stores no credentials or user data — reminders are in-memory and cleared on restart;
- allows any local plugin or the model to push reminders to the panel.

If you find a security issue (for example, the HTTP endpoints being reachable
from outside, or unintended data exposure), please report it privately by
opening a GitHub issue with the `security` label, or contact the maintainer
via the repository's issue tracker. Do not post exploit details publicly
before a fix is available.
