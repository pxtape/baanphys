import { describe, expect, it } from "vitest";
import { validateLearningItem } from "@/lib/learning-content";

const base = { id: null, skillId: "linear-motion", title: "SUVAT worksheet", kind: "sheet", resourceUrl: "https://drive.google.com/file/d/123/view", weight: 50, sortOrder: 1, isPublished: true };

describe("learning content links", () => {
  it("accepts Drive links for sheets and YouTube links for videos", () => {
    expect(validateLearningItem(base).data?.weight).toBe(50);
    expect(validateLearningItem({ ...base, kind: "video", resourceUrl: "https://youtu.be/abcdefghijk" }).data?.kind).toBe("video");
  });

  it("rejects links from the wrong provider and non-HTTPS URLs", () => {
    expect(validateLearningItem({ ...base, kind: "video" }).error).toMatch(/YouTube/);
    expect(validateLearningItem({ ...base, resourceUrl: "http://drive.google.com/file/d/123" }).error).toMatch(/https/);
  });
});
