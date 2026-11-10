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
Any ordered group of cards, top first. It can hold any number of cards, including none, and copies.
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
Several decks combined and dealt from as one, with a cut card that marks when to reshuffle.
_Avoid_: multi-deck

**Preset**:
A ready-made deck with a documented list of cards in a documented order. Some presets depend on a choice, such as the 500 deck's player count, with a fixed list for each.
_Avoid_: template, variant, deck type, generator

**Standard 52**:
The preset holding each standard card once, in new deck order.
_Avoid_: standard deck, full deck

**New deck order**:
The order a new standard 52 comes in from the box: face down from the top, hearts and clubs from ace to king, then diamonds and spades from king to ace, so the ace of spades is on the bottom.
_Avoid_: NDO, factory order

**Stripped deck**:
A preset made by removing ranks from the standard 52, such as Piquet or Euchre.

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

**Cut**:
To move cards from the top of a stack to the bottom, keeping their order.
_Avoid_: rotate, split

**Insert**:
To put cards into a stack at a position, keeping their order.

**Remove**:
To pull particular cards out of a stack, wherever they are: the topmost copy of each.
_Avoid_: delete

## Shoes

**Cut card**:
A marker in a shoe. Dealing past it means the shoe is due for a reshuffle.
_Avoid_: stop card

**Penetration**:
How far into a shoe the cut card sits, as the proportion of cards dealt before it's reached.
_Avoid_: depth

## Ordering

**Rank order**:
The ranks from lowest to highest, each listed once. It compares ranks, not cards, so a suit order or a game's rules can still separate cards of the same rank. Ranks a game counts as equal, such as blackjack's 10 and king, share a value instead. Ace high and ace low are the built-in rank orders.
_Avoid_: ranking, comparator, sort order

**Suit order**:
The suits from lowest to highest, each listed once.
_Avoid_: suit ranking

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
