import assert from "node:assert/strict";
import { test } from "node:test";
import { isStoryId, normalize, stripHtml } from "../src/guardian.js";

test("strips tags and decodes entities in standfirsts", () => {
  assert.equal(stripHtml("<p>Chips &amp; <strong>AI</strong>&nbsp;don&rsquo;t mix</p>"), "Chips & AI don't mix");
});

test("accepts Guardian ids and rejects path tricks", () => {
  assert.ok(isStoryId("technology/2026/oct/19/chipmakers-race"));
  assert.ok(!isStoryId("../search"));
  assert.ok(!isStoryId("technology"));
  assert.ok(!isStoryId("technology/2026/oct/19/x?api-key=y"));
});

test("normalizes a result and upgrades the thumbnail", () => {
  const s = normalize({
    id: "world/2026/oct/19/a",
    sectionId: "world",
    sectionName: "World news",
    webTitle: "Title",
    webUrl: "https://www.theguardian.com/world/2026/oct/19/a",
    webPublicationDate: "2026-10-19T10:00:00Z",
    fields: { trailText: "<p>Short</p>", thumbnail: "https://media.guim.co.uk/abc/0_0_100_60/500.jpg" },
  });
  assert.equal(s.summary, "Short");
  assert.equal(s.imageLarge, "https://media.guim.co.uk/abc/0_0_100_60/1000.jpg");
  assert.equal(s.byline, undefined);
});
