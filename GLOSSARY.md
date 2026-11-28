# deckshoes

The language of deckshoes: the cards, the stacks they sit in, and what you can do with them. Use these terms in code, docs and issues. Decisions behind them are in [docs/adr/](./docs/adr/).

## Cards

**Card**:
Any playing card.
_Avoid_: playing card, PlayingCard

**Ranked card**:
A card that has a rank. Ranked, suited and coloured are overlapping traits, not kinds of card.

**Suited card**:
A card that has a suit.

**Coloured card**:
A card that has a colour.

**Standard card**:
One of the 52 cards with a French suit and a rank from A to K: ranked, suited and coloured, with its colour fixed by its suit.
_Avoid_: normal card, regular card

**Rank**:
The mark, such as A, 2–10, J, Q or K on a standard card, that a game uses, often with the suit, to place a card relative to other cards. How the ranks compare is up to the game's rank order.
_Avoid_: value, face, number

**Suit**:
The set a suited card belongs to. The standard suits are spades, hearts, diamonds and clubs.
_Avoid_: colour, type

**Name**:
The words for a rank, suit or card, such as Ace, Spades or Ace of Spades. A suit's name is plural unless it describes something, as in a Diamond flush.
_Avoid_: label, title, display name, long name

**Notation**:
A way of writing a card as text: short, such as AS or 10H; symbol, such as A♠; the card's name, such as Ace of Spades; or its Unicode character, such as 🂡, from Unicode's Playing Cards block.
_Avoid_: style, text format, short code

**Colour**:
The colour a game treats a card as having: red or black for standard cards. It isn't the printing, so a four-colour deck's diamonds are still red.
_Avoid_: color (in prose)

**Joker**:
A coloured card with no rank or suit.
_Avoid_: wild card

**Copy**:
One of several identical cards in a stack, as in a shoe or a Pinochle deck.
_Avoid_: duplicate

**Value**:
The number a game gives a card, such as 10 for a king in blackjack.
_Avoid_: rank, score

## Stacks

**Stack**:
Any number of cards in an order, top first. It can hold none, and copies.
_Avoid_: collection, list, cards

**Top**:
The end of a stack that cards are drawn, dealt, burned and peeked from. The other end is the bottom.

**Position**:
A place in a stack, given as the number of cards above it: 0 is the top, and the stack's size is below the bottom card.
_Avoid_: index, offset

**Deck**:
The stack that cards are drawn and dealt from. A preset gives a full one.
_Avoid_: pack

**Hand**:
The stack dealt to one player.

**Short hand**:
A hand dealt fewer cards than the deal asked for, because the deck ran out.
_Avoid_: partial hand

**Pile**:
A stack set aside during play, such as the discard pile.
_Avoid_: heap, discards

**Remainder**:
The stack left after cards are drawn or dealt from it.
_Avoid_: rest, remaining

**Shoe**:
One or more decks combined and dealt from as one, with a cut card that marks when to reshuffle.
_Avoid_: multi-deck

**Preset**:
A ready-made deck with a documented list of cards in a documented order. Some presets depend on a choice, such as a Pinochle deck's size or the 500 deck's player count, with a fixed list for each.
_Avoid_: template, variant, deck type, generator

**Standard 52**:
The preset holding each standard card once, in new deck order.
_Avoid_: standard deck, full deck

**New deck order**:
The order a new standard 52 comes in from the box: face down from the top, hearts and clubs from ace to king, then diamonds and spades from king to ace, so the ace of spades is on the bottom.
_Avoid_: NDO, factory order

**Stripped deck**:
A deck made by removing ranks from the standard 52, such as the Piquet and Euchre presets. The cards left stay in new deck order.

**Compact string**:
A stack written as text: its cards top first, separated by single spaces, such as `AS 10H KD`. A shoe's adds its cut card's position in the stack before it, and then its discard pile, each after a bar: `AS 10H KD | 2 | 2C`.
_Avoid_: stack string, card list

## Actions

**Stack operation**:
Anything done to a stack, such as a shuffle, draw, deal or cut.
_Avoid_: deck operation

**Shuffle**:
To put a stack in random order. Unqualified, every order is equally likely.
_Avoid_: randomise, scramble

**Draw**:
To take cards from the top of a stack, or from the bottom when said.
_Avoid_: pop, take

**Peek**:
To look at cards from the top of a stack, or from the bottom when said, without taking them.

**Deal**:
To draw cards from a deck into hands, giving each hand a packet in turn until every hand has its cards.
_Avoid_: distribute

**Packet**:
The cards a hand gets at one time during a deal. Round-robin deals packets of one card. The largest packet is the same size as the hand.
_Avoid_: batch, block

**Burn**:
To move cards from the top to the discard pile without using them.
_Avoid_: discard

**Discard**:
To put cards that are finished with onto the discard pile.

**Cut**:
To move cards from the top of a stack to the bottom, keeping their order.
_Avoid_: rotate, split

**Insert**:
To put cards into a stack at a position, keeping their order.

**Remove**:
To pull particular cards out of a stack, wherever they are: the topmost copy of each.
_Avoid_: delete

**Sort**:
To put a stack in order by a rank order, lowest on top, with a suit order, if given, separating cards of the same rank. Cards that still tie keep their order.
_Avoid_: arrange, order (as a verb)

**Group**:
The cards in a stack that share a rank, or that share a suit, in their order in the stack. Grouping a stack by a rank or suit order gives one group for each entry, empty when the stack has none.
_Avoid_: bucket, partition, pile

## Shoes

**Cut card**:
A marker in a shoe. Once it's reached, the shoe is due for a reshuffle.
_Avoid_: stop card

**Penetration**:
How far into a shoe the cut card sits, as the proportion of cards dealt before it's reached.
_Avoid_: depth

**Discard pile**:
The pile in a shoe that burned and discarded cards go to. They're out of play until a reshuffle returns them to the shoe.
_Avoid_: discards, muck

**Reshuffle**:
To shuffle the discard pile back in with the cards left in a shoe, and put the cut card back in.

## Ordering

**Rank order**:
The ranks from lowest to highest, each listed once. It compares ranks, not cards, so a suit order or a game's rules can still separate cards of the same rank. Ranks a game counts as equal, such as blackjack's 10 and king, share a value instead. Ace high and ace low are the built-in rank orders.
_Avoid_: ranking, comparator, sort order

**Suit order**:
The suits from lowest to highest, each listed once. Bridge order, from clubs through diamonds and hearts to spades, is the built-in suit order.
_Avoid_: suit ranking

## Blackjack

**Total**:
The sum of a hand's values in blackjack, with an ace counted as 11 when that keeps the total at 21 or under, and as 1 otherwise.
_Avoid_: score, points, count

**Soft**:
A hand whose total counts an ace as 11, such as A 6, a soft 17.

**Hard**:
A hand whose total counts no ace as 11, such as 10 7 or A 6 K, both hard 17.

**Blackjack**:
A two-card hand of an ace and a 10, J, Q or K.
_Avoid_: natural

**Bust**:
A hand whose total is over 21.
_Avoid_: busted, broke

**Counting system**:
A tag for every card, which a player adds up as cards are seen, to judge what's left to deal. Hi-Lo is the most common.
_Avoid_: count system, strategy

**Tag**:
The number a counting system gives a card, such as +1 for a 5 in Hi-Lo.
_Avoid_: value, weight, count value

**Hi-Lo**:
The counting system that tags 2 to 6 as +1, 7 to 9 as 0, and 10, J, Q, K and A as −1, so a standard 52 adds up to 0.
_Avoid_: High-Low, Hi-Low

**Running count**:
The sum of the tags of the cards seen since the last shuffle.

**True count**:
The running count divided by the number of decks left to deal.
_Avoid_: count per deck

## Poker

**Poker hand**:
The cards a poker player is judged by: the best five of the cards they can use, or all of them while there are fewer than five, such as two hole cards before the flop.
_Avoid_: five-card hand, combination, holding

**Category**:
The kind of poker hand, from highest to lowest: straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, one pair and high card. A poker hand in a higher category beats any in a lower one.
_Avoid_: hand rank, hand ranking, hand type

**Kicker**:
A card in a poker hand outside the cards that make its category, compared only when those cards tie: the A, 7 and 2 in K K A 7 2.
_Avoid_: side card

**Wheel**:
A 2 3 4 5, the lowest straight, where the ace counts low.
_Avoid_: bicycle

**Royal flush**:
A K Q J 10 of one suit: the highest straight flush, though not a category of its own.

**Hole cards**:
Cards dealt face down to one player, seen only by them, such as hold'em's two or stud's first two and last.
_Avoid_: pocket cards, down cards

**Up cards**:
Cards dealt face up to one player, which every player can see, as in stud.
_Avoid_: showing cards, door cards

**Community cards**:
Cards dealt face up in the middle of the table for every player to use, such as hold'em's five.
_Avoid_: board, shared cards

## Bridge

**High-card points**:
A hand's points for its aces, kings, queens and jacks: 4 for each ace, 3 for each king, 2 for each queen and 1 for each jack, so a standard 52 holds 40 and a hand of 13 cards dealt from one at most 37.
_Avoid_: HCP, honour points, point count

**Suit length**:
How many cards of one suit a hand holds.

**Distribution**:
A hand's suit lengths, longest first, whichever suits they're in, written such as 4-3-3-3 or 5-4-3-1.
_Avoid_: shape, hand pattern, pattern

**Void**:
A suit length of 0.

**Singleton**:
A suit length of 1, or the one card a hand holds in that suit.

**Doubleton**:
A suit length of 2, or the two cards a hand holds in that suit.

**Balanced**:
A hand with no void or singleton and at most one doubleton: a distribution of 4-3-3-3, 4-4-3-2 or 5-3-3-2.

**Partnership**:
Two players who sit opposite each other and play as a side, North and South or East and West.
_Avoid_: pair, team

## Library

**Random source**:
Where every random operation gets its randomness: secure by default, reproducible when seeded.
_Avoid_: RNG, PRNG, generator, randomiser

**Chain**:
A stack wrapped so that operations can be written as a pipeline and then unwrapped. Once an operation gives something a pipeline can't carry on from, the result is a terminated chain.
_Avoid_: wrapper, fluent API, builder

**Terminated chain**:
A chain holding something a pipeline can't carry on from, such as drawn cards and the remainder, or peeked cards. It can only be unwrapped.
_Avoid_: ended chain, split chain

**Install**:
One installation of the deckshoes package in an app, which can have more than one, such as when a dependency needs another major version.
_Avoid_: copy, duplicate
