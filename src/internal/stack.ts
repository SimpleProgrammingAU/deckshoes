import { InvalidArgumentError } from "../errors.ts";
import { display } from "./display.ts";

/** Returns the error for a stack that isn't an array, for a public function to throw itself. */
export function invalidStack(value: unknown): InvalidArgumentError {
  return new InvalidArgumentError(
    `Invalid stack ${display(value)}: expected an array of cards`,
  );
}
