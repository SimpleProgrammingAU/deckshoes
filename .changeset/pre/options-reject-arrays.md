---
"deckshoes": patch
---

An array passed as the options to `shuffle`, `cut`, `insert`, `deal`, `rankName`, `suitName` or `formatCard` now throws `InvalidArgumentError`, as anything else that isn't an object does. It used to be ignored, so the defaults applied. Error messages now show an array as `(array)`, rather than `(object)`.
