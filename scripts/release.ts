/**
 * Stages the current version on npm for a maintainer to approve, then tags it.
 *
 * The release workflow runs this (via `pnpm release`) when there are no
 * pending changesets, which is right after a "version packages" PR merges.
 * npm only lets this repo's trusted publisher *stage* releases, so nothing
 * reaches users until a maintainer runs `npm stage approve <stage-id>` (2FA).
 *
 * The git tag `v<version>` marks a version as handled: once it exists, later
 * runs do nothing. `changeset tag` creates the tag and reports it through
 * `$CHANGESETS_OUTPUT`, so changesets/action pushes it, creates the GitHub
 * release and triggers the docs deploy.
 *
 * Pass `--dry-run` to see what would happen without staging or tagging.
 */
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const shell = process.platform === "win32";

const { name, version } = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8"),
) as { name: string; version: string };
const gitTag = `v${version}`;

function run(
  command: string,
  args: readonly string[],
  options: SpawnSyncOptions = {},
): { status: number | null; stdout: string } {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell,
    ...options,
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: String(result.stdout) };
}

function summary(markdown: string): void {
  const file = process.env["GITHUB_STEP_SUMMARY"];
  if (file !== undefined && file !== "") appendFileSync(file, `${markdown}\n`);
}

/** The npm dist-tag: the prerelease tag in Changesets pre mode, else `latest`. */
function distTag(): string {
  const preFile = path.join(ROOT, ".changeset", "pre.json");
  if (!existsSync(preFile)) return "latest";
  const pre = JSON.parse(readFileSync(preFile, "utf8")) as {
    mode?: string;
    tag?: string;
  };
  return pre.mode === "pre" && pre.tag !== undefined ? pre.tag : "latest";
}

function tagAndReport(): void {
  if (dryRun) {
    console.log(`release: would create git tag ${gitTag}`);
    return;
  }
  const result = run("pnpm", ["exec", "changeset", "tag"], {
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error("changeset tag failed");
}

function main(): void {
  // 1. Already tagged: this version was staged (or published) by an earlier run.
  const remote = run("git", [
    "ls-remote",
    "--exit-code",
    "--tags",
    "origin",
    `refs/tags/${gitTag}`,
  ]);
  if (remote.status === 0) {
    console.log(`release: ${gitTag} is already tagged; nothing to do.`);
    return;
  }
  if (remote.status !== 2) {
    throw new Error(`release: couldn't check for tag ${gitTag} on origin`);
  }

  // 2. Already public on npm (published some other way): just tag it.
  const published = run("npm", ["view", `${name}@${version}`, "version"]);
  if (published.status === 0 && published.stdout.trim() === version) {
    console.log(`release: ${name}@${version} is already on npm; tagging it.`);
    tagAndReport();
    return;
  }

  // 3. Stage it for approval, then tag it.
  const tag = distTag();
  const stage = run(
    "npm",
    [
      "stage",
      "publish",
      "--tag",
      tag,
      "--access",
      "public",
      "--ignore-scripts",
      ...(dryRun ? ["--dry-run"] : []),
    ],
    { stdio: "inherit" },
  );
  if (stage.status !== 0) {
    throw new Error(`release: npm stage publish failed for ${name}@${version}`);
  }

  tagAndReport();

  const approve = [
    `### ${name}@${version} is staged on npm`,
    "",
    `It goes live on the \`${tag}\` dist-tag once a maintainer approves it, using 2FA:`,
    "",
    "```sh",
    `npm stage list ${name}`,
    "npm stage approve <stage-id>",
    "```",
    "",
    `Or approve it at https://www.npmjs.com/package/${name}.`,
  ].join("\n");
  console.log(`\n${approve}`);
  if (!dryRun) summary(approve);
}

main();
