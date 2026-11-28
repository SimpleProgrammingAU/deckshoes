/**
 * Blackjack: hand totals, soft hands, blackjack and bust, and running and
 * true counts. Import them from `deckshoes/blackjack`.
 *
 * @module deckshoes/blackjack
 */

export { runningCount, type RunningCountOptions, trueCount } from "./count.ts";
export { handTotal, isBlackjack, isBust, isSoft } from "./hand.ts";
