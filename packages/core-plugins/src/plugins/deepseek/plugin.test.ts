import { afterEach, describe, expect, it, vi } from "vitest";
import { deepseekPlugin } from "./plugin";

describe("DeepSeek conversation extraction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts messages from history responses using fragments", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify({ value: "test-token" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            biz_data: {
              chat_session: { title: "Fragment conversation" },
              chat_messages: [
                {
                  message_id: 1,
                  role: "USER",
                  fragments: [
                    { type: "REQUEST", content: "Question" },
                  ],
                },
                {
                  message_id: 2,
                  role: "ASSISTANT",
                  fragments: [
                    { type: "THINK", content: "Private reasoning" },
                    { type: "RESPONSE", content: "First sentence." },
                    { type: "RESPONSE", content: "Second sentence." },
                  ],
                },
              ],
            },
          },
        }),
      }),
    );

    const bundle = await deepseekPlugin.fetchById!("session-id");

    expect(bundle.nodes.map((node) => node.content)).toEqual([
      "Question",
      "First sentence.\nSecond sentence.",
    ]);
  });

  it("continues to extract messages from top-level content responses", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify({ value: "test-token" }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            biz_data: {
              chat_messages: [
                { message_id: 1, role: "USER", content: "Question" },
                { message_id: 2, role: "ASSISTANT", content: "Answer" },
              ],
            },
          },
        }),
      }),
    );

    const bundle = await deepseekPlugin.fetchById!("session-id");

    expect(bundle.nodes.map((node) => node.content)).toEqual([
      "Question",
      "Answer",
    ]);
  });
});
