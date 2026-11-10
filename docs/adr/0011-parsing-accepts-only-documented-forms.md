# Parsing accepts only documented forms

A parse function reads exactly the forms its docs list, ignoring the case of A–Z only, and nothing else: no trimming, no extra spaces, no lookalike characters. Loosening a parser is a minor change, but tightening one breaks callers, so each accepted form is a commitment for the whole major version.

Card parsing lists two exceptions, each decided on its own:

- **A variation selector after a suit symbol.** It only chooses whether the same character shows as text or as an emoji, so it isn't extra text. A phone's emoji keyboard types `♥️` this way.
- **The outline suit symbols `♤ ♡ ♢ ♧`.** They're different characters from `♠ ♥ ♦ ♣`, and so lookalikes, but they're a common way to write the suits, such as the red suits in bridge columns.

Any other lookalike, such as `❤️` for hearts, needs a decision of its own, not an appeal to these.

## Considered options

- **Lenient parsing**, trimming, collapsing spaces and folding case across Unicode. It's friendlier, but every spelling it accepts becomes permanent, and Unicode case folding reads the Kelvin sign (U+212A) as `k`.

## Consequences

- Callers trim user input themselves: `parseCard(input.trim())`.
- Unicode characters such as `🂡` ([#23](https://github.com/SimpleProgrammingAU/deckshoes/issues/23)) follow the same rule, and so will compact strings ([#30](https://github.com/SimpleProgrammingAU/deckshoes/issues/30)).
