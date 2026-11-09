# Security policy

## Supported versions

Security fixes land on the current `main` branch and in the latest published release of `@xtcel/reaui-cli`. Older releases are not patched.

## Reporting a vulnerability

**Do not open a public issue.**

Use GitHub's private vulnerability reporting:

https://github.com/xtcel/rea.ui/security/advisories/new

Please include the affected version, reproduction steps and the impact you believe it has. You can expect an initial reply within 7 days.

## Scope

REA UI parses untrusted input, so the interesting surface is the parser and the archive layer:

- `reaui validate` / `reaui unpack` on a malicious `.reaui` or `pages/*.page.tsx`
- path traversal or symlink escapes while unpacking
- ZIP handling: zip bombs, duplicate entries, oversized assets
- anything that turns static parsing into code execution

Design code is never executed — pages are parsed as a static AST subset. A report showing that this boundary can be crossed is the highest-severity issue we can receive.

Vulnerabilities in third-party dependencies should be reported upstream; we will still take a report that shows a concrete impact through REA UI.

## Out of scope

- Denial of service from extremely large but otherwise valid documents, unless it is disproportionate
- Issues that require the user to run a modified build of the app
- Content of designs produced by users
