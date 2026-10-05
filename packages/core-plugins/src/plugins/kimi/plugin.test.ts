import { afterEach, describe, expect, it, vi } from "vitest";
import { kimiPlugin } from "./plugin";

describe("Kimi plugin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matches Kimi chat URLs and extracts messages in conversation order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [
          {
            id: "assistant-1",
            parentId: "user-1",
            role: "assistant",
            childrenMessageIds: [],
            blocks: [{ text: { content: "Answer" } }],
          },
          {
            id: "root",
            parentId: "00000000-0000-0000-0000-000000000000",
            role: "system",
            childrenMessageIds: ["user-1"],
          },
          {
            id: "user-1",
            parentId: "root",
            role: "user",
            childrenMessageIds: ["assistant-1"],
            blocks: [{ text: { content: "Question" } }],
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { title: "Example chat - Kimi" });

    expect(kimiPlugin.urls.match("https://www.kimi.ai/chat/chat-id")).toBe(
      true,
    );
    expect(kimiPlugin.urls.match("https://www.kimi.com/chat/chat-id")).toBe(
      true,
    );

    const bundle = await kimiPlugin.extract({
      url: "https://www.kimi.ai/chat/chat-id",
      document: { title: "Example chat - Kimi" } as Document,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/ListMessages"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chatId: "chat-id" }),
      }),
    );
    expect(bundle.nodes.map((node) => node.content)).toEqual([
      "Question",
      "Answer",
    ]);
    expect(bundle.source.platform).toBe("kimi");
  });

  it("supports responses wrapped in data and joins text blocks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            messages: [
              {
                id: "user",
                role: "user",
                blocks: [
                  { text: { content: "First part" } },
                  { text: { content: "Second part" } },
                ],
              },
            ],
          },
        }),
      }),
    );
    vi.stubGlobal("document", { title: "Kimi" });

    const bundle = await kimiPlugin.extract({
      url: "https://kimi.ai/chat/chat-id",
      document: { title: "Kimi" } as Document,
    });

    expect(bundle.nodes.map((node) => node.content)).toEqual([
      "First part\n\nSecond part",
    ]);
  });
});
