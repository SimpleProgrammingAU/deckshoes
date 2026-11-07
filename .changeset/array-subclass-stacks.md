---
"deckshoes": patch
---

Stack operations now always return plain frozen arrays, whatever array they're given. An Array subclass could make `shuffle` throw a raw `TypeError`, return its own class or something that isn't an array, or lose cards. A hole in a sparse array now comes back as `undefined`.
