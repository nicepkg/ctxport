import type { ContentBundle } from "@ctxport/core-schema";
import { describe, it, expect } from "vitest";
import { serializeConversation, serializeBundle } from "../serializer";

function makeBundle(overrides: Partial<ContentBundle> = {}): ContentBundle {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Test Conversation",
    participants: [
      { id: "user-1", name: "User", role: "user" },
      { id: "assistant-1", name: "Assistant", role: "assistant" },
    ],
    nodes: [
      {
        id: "00000000-0000-0000-0000-000000000010",
        participantId: "user-1",
        content: "Hello, how are you?",
        order: 0,
      },
      {
        id: "00000000-0000-0000-0000-000000000011",
        participantId: "assistant-1",
        content:
          "I'm doing well! Here's some code:\n\n```python\nprint('hello')\n```",
        order: 1,
      },
    ],
    source: {
      platform: "chatgpt",
      url: "https://chatgpt.com/c/abc123",
      extractedAt: "2026-02-07T14:30:00.000Z",
      pluginId: "chatgpt-ext",
      pluginVersion: "1.0.0",
    },
    ...overrides,
  };
}

describe("serializeConversation", () => {
  it("should serialize with frontmatter by default", () => {
    const bundle = makeBundle();
    const result = serializeConversation(bundle);

    expect(result.markdown).toContain("---");
    expect(result.markdown).toContain("ctxport: v2");
    expect(result.markdown).toContain("source: chatgpt");
    expect(result.markdown).toContain("title: Test Conversation");
    expect(result.markdown).toContain("## User");
    expect(result.markdown).toContain("## Assistant");
    expect(result.messageCount).toBe(2);
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it("should serialize without frontmatter when disabled", () => {
    const bundle = makeBundle();
    const result = serializeConversation(bundle, { includeFrontmatter: false });

    expect(result.markdown).not.toContain("---\nctxport");
    expect(result.markdown).toContain("## User");
  });

  it("should handle user-only format", () => {
    const bundle = makeBundle();
    const result = serializeConversation(bundle, { format: "user-only" });

    expect(result.markdown).toContain("## User");
    expect(result.markdown).not.toContain("## Assistant");
  });

  it("should handle code-only format", () => {
    const bundle = makeBundle();
    const result = serializeConversation(bundle, { format: "code-only" });

    expect(result.markdown).toContain("```python");
    expect(result.markdown).not.toContain("Hello, how are you?");
  });

  it("should handle empty nodes", () => {
    const bundle = makeBundle({ nodes: [] });
    const result = serializeConversation(bundle);

    expect(result.messageCount).toBe(0);
    expect(result.estimatedTokens).toBe(0);
  });

  it("should escape title with special characters in frontmatter", () => {
    const bundle = makeBundle({ title: 'Discussing "REST API": auth' });
    const result = serializeConversation(bundle);

    expect(result.markdown).toContain(
      'title: "Discussing \\"REST API\\": auth"',
    );
  });

  it("should handle system role nodes", () => {
    const bundle = makeBundle({
      participants: [
        { id: "system-1", name: "System", role: "system" },
        { id: "user-1", name: "User", role: "user" },
      ],
      nodes: [
        {
          id: "00000000-0000-0000-0000-000000000010",
          participantId: "system-1",
          content: "You are a helpful assistant.",
          order: 0,
        },
        {
          id: "00000000-0000-0000-0000-000000000011",
          participantId: "user-1",
          content: "Hello",
          order: 1,
        },
      ],
    });
    const result = serializeConversation(bundle);

    expect(result.markdown).toContain("## System");
    expect(result.markdown).toContain("## User");
  });

  it("should handle bundle without url in source", () => {
    const bundle = makeBundle({
      source: {
        platform: "chatgpt",
        extractedAt: "2026-02-07T14:30:00.000Z",
        pluginId: "chatgpt-ext",
        pluginVersion: "1.0.0",
      },
    });
    const result = serializeConversation(bundle);

    expect(result.markdown).toContain("ctxport: v2");
    expect(result.markdown).toContain("source: chatgpt");
    expect(result.markdown).not.toContain("url:");
  });

  it("should preserve code blocks with nested backticks", () => {
    const bundle = makeBundle({
      nodes: [
        {
          id: "00000000-0000-0000-0000-000000000010",
          participantId: "assistant-1",
          content:
            "Here is markdown:\n\n````md\n```python\nprint('hi')\n```\n````",
          order: 0,
        },
      ],
    });
    const result = serializeConversation(bundle);

    expect(result.markdown).toContain("````md");
    expect(result.markdown).toContain("```python");
  });
});

describe("serializeBundle", () => {
  it("should merge multiple bundles", () => {
    const bundle1 = makeBundle({ title: "First Chat" });
    const bundle2 = makeBundle({
      id: "00000000-0000-0000-0000-000000000002",
      title: "Second Chat",
      source: {
        platform: "claude",
        url: "https://claude.ai/chat/def456",
        extractedAt: "2026-02-07T14:30:00.000Z",
        pluginId: "claude-ext",
        pluginVersion: "1.0.0",
      },
    });

    const result = serializeBundle([bundle1, bundle2]);

    expect(result.markdown).toContain("bundle: merged");
    expect(result.markdown).toContain("conversations: 2");
    expect(result.markdown).toContain("# [1/2] First Chat");
    expect(result.markdown).toContain("# [2/2] Second Chat");
    expect(result.markdown).toContain("---");
    expect(result.messageCount).toBe(4);
  });

  it("should handle single bundle", () => {
    const bundle = makeBundle({ title: "Solo Chat" });
    const result = serializeBundle([bundle]);

    expect(result.markdown).toContain("bundle: merged");
    expect(result.markdown).toContain("conversations: 1");
    expect(result.markdown).toContain("# [1/1] Solo Chat");
  });

  it("should handle bundles without titles using Untitled", () => {
    const bundle = makeBundle({ title: undefined });
    const result = serializeBundle([bundle]);

    expect(result.markdown).toContain("# [1/1] Untitled");
  });
});
