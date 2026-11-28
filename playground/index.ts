// The deckshoes quick start, from the README, running against the latest
// release on npm. Each `// =>` comment shows the value its line gives. To see
// a value in the terminal, wrap it in console.log(). Edit this file and it
// runs again.

import { card, chain, seededRandom, shuffle } from "deckshoes";
import { standard52 } from "deckshoes/presets";

// A deck in new deck order, the order a new deck comes out of the box in.
const deck = standard52();
deck.length; // => 52
deck[0] === card("A", "H"); // => true

// Shuffle it. The seed makes the order the same every time.
const shuffled = shuffle(deck, { random: seededRandom(42) });
shuffled.slice(0, 3); // => [card("7", "H"), card("6", "C"), card("10", "D")]

// The same thing written as a chain, unwrapped with .value().
chain(deck)
  .shuffle({ random: seededRandom(42) })
  .value(); // => shuffled

// Shuffling returns a new stack and leaves the deck as it was.
deck[0] === card("A", "H"); // => true

// Print the shuffled deck's top three cards in the terminal.
console.log(shuffled.slice(0, 3));
