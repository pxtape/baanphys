import { describe, expect, it } from "vitest";
import { parseDriveFileId } from "./drive-link";
describe("Drive file links", () => {
  it.each(["https://drive.google.com/file/d/abcdef123456789/view", "https://drive.google.com/open?id=abcdef123456789", "https://docs.google.com/document/d/abcdef123456789/edit"])("accepts a Google file link: %s", (link) => expect(parseDriveFileId(link)).toBe("abcdef123456789"));
  it.each(["javascript:alert(1)", "https://drive.google.com.evil.example/file/d/abcdef123456789/view", "https://drive.google.com/drive/folders/abcdef123456789", "https://user:password@drive.google.com/file/d/abcdef123456789/view", "https://drive.google.com/file/d/short/view"])("rejects untrusted or invalid links: %s", (link) => expect(parseDriveFileId(link)).toBeNull());
});
