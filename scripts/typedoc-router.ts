/**
 * A TypeDoc plugin that keeps the API reference's page paths where they were
 * published.
 *
 * With two entry points, TypeDoc puts each page under its module's name, so
 * `classes/InvalidCardError.html` would move to
 * `classes/deckshoes.InvalidCardError.html`. This router drops the prefix for
 * the `deckshoes` module only. Presets pages keep theirs, such as
 * `functions/deckshoes_presets.standard52.html`.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import {
  type Application,
  KindRouter,
  type Reflection,
  RendererEvent,
} from "typedoc";

/** A published page of the `deckshoes` module, which must not move. */
const KNOWN_PAGE = "classes/InvalidCardError.html";

/** TypeDoc's default router, without the `deckshoes.` prefix. */
class DeckshoesRouter extends KindRouter {
  protected override getIdealBaseName(reflection: Reflection): string {
    return super
      .getIdealBaseName(reflection)
      .replace(/^([a-z]+)\/deckshoes\./u, "$1/");
  }
}

/**
 * Adds the `deckshoes` router, and fails the build if a published page moved.
 *
 * @param app - The TypeDoc application loading the plugin.
 */
export function load(app: Application): void {
  app.renderer.defineRouter("deckshoes", DeckshoesRouter);

  // A TypeDoc update could stop calling the method above, or change what it
  // returns, and the pages would move without any error.
  app.renderer.on(RendererEvent.END, (event) => {
    if (!existsSync(path.join(event.outputDirectory, KNOWN_PAGE))) {
      app.logger.error(
        `${KNOWN_PAGE} wasn't built, so the API reference's page paths have moved. Check scripts/typedoc-router.ts against this TypeDoc version.`,
      );
    }
  });
}
