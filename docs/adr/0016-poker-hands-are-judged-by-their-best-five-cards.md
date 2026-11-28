# Poker hands are judged by their best five cards

`deckshoes/poker` judges a player's cards as a poker hand: the best five of them, or all of them while there are fewer than five. `handCategory(cards)`, `bestHand(cards)` and `compareHands(cards, otherCards)` take one card or more. So hold'em can be judged on every street, from a pair in the hole cards before the flop to the best five of seven at the showdown, and stud's best showing hand can be judged from the up cards alone. With fewer than five cards, only high card, one pair, two pair, three of a kind and four of a kind can be made. The rules are high-hand poker's: the ace is high, and low only in the wheel; straights don't wrap round; and suits never rank, so poker hands with the same category and ranks tie, and split the pot. That fixes the rank order, so no call takes one ([ADR 0015](./0015-game-helpers-ship-from-their-own-subpaths.md)).

```ts no-test
handCategory([...holeCards, ...communityCards]); // Category.FULL_HOUSE
compareHands([...mine, ...communityCards], [...theirs, ...communityCards]); // 1
handCategory([card("A", "S"), card("A", "H")]); // Category.ONE_PAIR
```

## Considered options

- **Exactly five cards** for `handCategory` and `compareHands`, with `bestHand` to choose them. Every hold'em call would need `bestHand` first, and the seven cards the game deals would throw.
- **Five or more cards,** with fewer throwing. It would catch a stack passed before its last cards were dealt, but it rules out the pre-flop pair and stud's showing hand, which games need judged.
- **Judging copies quietly.** A♠ A♠ A♥ A♦ A♣ would come out as four aces with an ace kicker, a poker hand no deck can deal. Five of a kind, from wild cards or jokers, would then change a result users already get, rather than one that used to throw.
- **One `evaluateHand(cards)` returning `{ category, cards }`.** It reads each poker hand once at a showdown, but blackjack's helpers answer one question each, and comparing is the question most callers ask.
- **A suit order to break ties,** as some home games use. No casino or tournament game ranks suits in a poker hand. Stud's bring-in, the one place suits count, compares single cards, which `compareCards` already does with `SuitOrder.BRIDGE`.

## Consequences

- A copy, the same rank and suit twice, throws `INVALID_ARGUMENT`, naming both positions. No casino or tournament game is dealt from more than one deck, and multi-play video poker deals each hand from its own deck. Wild cards and five of a kind can arrive with custom decks ([#39](https://github.com/SimpleProgrammingAU/deckshoes/issues/39), [#40](https://github.com/SimpleProgrammingAU/deckshoes/issues/40)) as a minor change, since the only results that change are calls that used to throw.
- `compareHands` throws `INVALID_ARGUMENT` for hands of different sizes when either has fewer than five cards. No game the helpers cover compares them, and the games that do, Chinese poker and Pai Gow Poker, settle a shorter hand's missing kickers by rules of their own.
- `bestHand` puts the cards that make the category first, bigger groups before smaller, then the kickers, all high to low, with the wheel as 5 4 3 2 A. Among cards that would do equally well, the one nearest the top is used, so the result needs no suit order.
- A royal flush is the highest straight flush, not a category, and there's no exported category order: `compareHands` does the comparing.
- Omaha, short-deck hold'em, Three Card Poker, low hands, hi-lo splits, wild cards, Chinese poker and Pai Gow Poker each break one of these rules, and are left to [#100](https://github.com/SimpleProgrammingAU/deckshoes/issues/100). Until Omaha is covered, its best poker hand is the best of the 60 fives that use two hole cards and three community cards, found with `compareHands`.
