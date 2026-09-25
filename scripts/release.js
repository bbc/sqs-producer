import { readFile, writeFile } from "node:fs/promises";

import { extractReleaseNotes, validateRelease } from "./lib/release.js";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const [command, argument] = process.argv.slice(2).filter((value) => value !== "--");

if (command === "validate") {
  const changelog = await readFile("CHANGELOG.md", "utf8");
  const release = validateRelease(packageJson, changelog, argument);
  process.stdout.write(`${JSON.stringify(release)}\n`);
} else if (command === "notes") {
  const changelog = await readFile("CHANGELOG.md", "utf8");
  const notes = extractReleaseNotes(changelog, packageJson.version);
  await writeFile(argument, `${notes}\n`);
} else {
  throw new Error(`Unknown release command: ${command}`);
}
