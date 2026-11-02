# Security policy

## Supported versions

| Version         | Supported                  |
| --------------- | -------------------------- |
| 1.x (and alpha) | Yes                        |
| 0.x             | No. Please upgrade to 1.x. |

## Reporting a vulnerability

Please **don't** open a public issue for security problems.

Report them privately through GitHub instead: go to the [Security tab](https://github.com/SimpleProgrammingAU/deckshoes/security/advisories/new) and choose **Report a vulnerability**. Include what you found, how to reproduce it, and the version affected.

You should get a reply within 7 days. Once a fix is ready, it is released as a patch and the advisory is published with credit to you, unless you'd rather stay anonymous.

## Scope

deckshoes has no runtime dependencies and doesn't do any I/O, so the most likely issues are:

- **Predictable shuffles.** Shuffling (arriving during the 1.0 alpha) uses `crypto.getRandomValues` by default. Report anything that makes the default shuffle biased or predictable.
- **Denial of service** from crafted input to parsing functions.

Seeded random number generators are deliberately predictable. Don't use them where the outcome matters, such as real-money games.
