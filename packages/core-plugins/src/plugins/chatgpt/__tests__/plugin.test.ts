import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PluginContext } from "../../../types";
import { chatgptPlugin } from "../plugin";

const CONVERSATION_ID = "68ab12cd-3456-7890-abcd-ef0123456789";

function mockChatGPTApi() {
  const fetchMock = vi.fn(async (input: string) => {
    if (input.endsWith("/api/auth/session")) {
      return new Response(JSON.stringify({ accessToken: "token" }));
    }
    return new Response(
      JSON.stringify({
        title: "Test",
        current_node: "a",
        mapping: {
          u: {
            id: "u",
            parent: null,
            children: ["a"],
            message: {
              author: { role: "user" },
              content: { content_type: "text", parts: ["Hello"] },
            },
          },
          a: {
            id: "a",
            parent: "u",
            children: [],
            message: {
              author: { role: "assistant" },
              content: { content_type: "text", parts: ["Hi"] },
            },
          },
        },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function ctx(url: string): PluginContext {
  return { url, document: {} as Document };
}

describe("chatgptPlugin.extract", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts a regular conversation", async () => {
    const fetchMock = mockChatGPTApi();
    const bundle = await chatgptPlugin.extract(
      ctx(`https://chatgpt.com/c/${CONVERSATION_ID}`),
    );
    expect(bundle.nodes).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://chatgpt.com/backend-api/conversation/${CONVERSATION_ID}`,
      expect.anything(),
    );
  });

  it("extracts a conversation inside a project", async () => {
    const fetchMock = mockChatGPTApi();
    const bundle = await chatgptPlugin.extract(
      ctx(
        `https://chatgpt.com/g/g-p-67f0a1b2c3d4-vosstanovlenie-saita/c/${CONVERSATION_ID}`,
      ),
    );
    expect(bundle.nodes).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://chatgpt.com/backend-api/conversation/${CONVERSATION_ID}`,
      expect.anything(),
    );
  });

  it("rejects non-conversation pages", async () => {
    await expect(
      chatgptPlugin.extract(
        ctx("https://chatgpt.com/g/g-p-67f0a1b2c3d4/project"),
      ),
    ).rejects.toMatchObject({ code: "E-PARSE-001" });
  });
});
