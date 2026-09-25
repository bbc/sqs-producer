import { describe, expect, it } from "vitest";
import {
  extractReleaseNotes,
  validateRelease,
  validateVersion,
} from "../../scripts/lib/release.js";

describe("release metadata", () => {
  it("rejects invalid versions", () => {
    expect(() => validateVersion("$(echo unsafe)")).toThrow("Invalid release version");
  });

  it("extracts the matching changelog section", () => {
    const changelog =
      "## 9.0.6\n\n### Patch Changes\n\n- Fix batching\n\n## [9.0.5](https://example.com)\n\n- Previous";

    expect(extractReleaseNotes(changelog, "9.0.6")).toBe("### Patch Changes\n\n- Fix batching");
  });

  it("validates matching versions, release branch, and changelog", () => {
    expect(
      validateRelease(
        { name: "sqs-producer", version: "9.0.6" },
        "## 9.0.6\n\n- Fix batching",
        "release/v9.0.6",
      ),
    ).toEqual({ name: "sqs-producer", version: "9.0.6", tag: "v9.0.6" });
  });

  it("validates a matching release tag", () => {
    expect(
      validateRelease(
        { name: "sqs-producer", version: "9.0.6" },
        "## 9.0.6\n\n- Fix batching",
        "v9.0.6",
      ),
    ).toEqual({ name: "sqs-producer", version: "9.0.6", tag: "v9.0.6" });
  });

  it("rejects a release from an unexpected reference", () => {
    expect(() =>
      validateRelease(
        { name: "sqs-producer", version: "9.0.6" },
        "## 9.0.6\n\n- Fix batching",
        "feature/unreviewed",
      ),
    ).toThrow("must be release/v9.0.6 or v9.0.6");
  });

  it("rejects an unexpected registry package", () => {
    expect(() =>
      validateRelease(
        { name: "other-package", version: "9.0.6" },
        "## 9.0.6\n\n- Fix batching",
        "release/v9.0.6",
      ),
    ).toThrow("Unexpected npm package name");
  });
});
