# Parsing accepts only documented forms

A parse function reads exactly the forms its docs list, ignoring the case of A–Z only, and nothing else: no trimming, no extra spaces, no lookalike characters. Loosening a parser is a minor change, but tightening one breaks callers, so each accepted form is a commitment for the whole major version. Another presentation of the same character, such as a variation selector after a suit symbol or an outline suit symbol, isn't extra text, so it's accepted.

## Considered options

- **Lenient parsing**, trimming, collapsing spaces and folding case across Unicode. It's friendlier, but every spelling it accepts becomes permanent, and Unicode case folding reads the Kelvin sign `K` as `k`.

## Consequences

- Callers trim user input themselves: `parseCard(input.trim())`.
- Unicode playing-card characters ([#23](https://github.com/SimpleProgrammingAU/deckshoes/issues/23)) and compact strings ([#30](https://github.com/SimpleProgrammingAU/deckshoes/issues/30)) follow the same rule.
