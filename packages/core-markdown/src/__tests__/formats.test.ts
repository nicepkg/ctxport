import type { ContentNode, Participant } from "@ctxport/core-schema";
import { describe, it, expect } from "vitest";
import { filterNodes } from "../formats";

const participants: Participant[] = [
  { id: "user-1", name: "User", role: "user" },
  { id: "assistant-1", name: "Assistant", role: "assistant" },
];

function makeNodes(): ContentNode[] {
  return [
    {
      id: "00000000-0000-0000-0000-000000000010",
      participantId: "user-1",
      content: "What is recursion?",
      order: 0,
    },
    {
      id: "00000000-0000-0000-0000-000000000011",
      participantId: "assistant-1",
      content:
        "Recursion is when a function calls itself.\n\n```python\n# A simple example\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n```\n\nThis computes n!",
      order: 1,
    },
  ];
}

describe("filterNodes", () => {
  it("full format includes all nodes with role headers", () => {
    const parts = filterNodes(makeNodes(), participants, "full");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("## User");
    expect(parts[1]).toContain("## Assistant");
  });

  it("user-only format includes only user nodes", () => {
    const parts = filterNodes(makeNodes(), participants, "user-only");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toContain("## User");
    expect(parts[0]).toContain("What is recursion?");
  });

  it("code-only format extracts only code blocks", () => {
    const parts = filterNodes(makeNodes(), participants, "code-only");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toContain("```python");
    expect(parts[0]).not.toContain("This computes n!");
    expect(parts[0]).not.toContain("What is recursion?");
  });

  it("compact format removes comments and collapses blanks", () => {
    const parts = filterNodes(makeNodes(), participants, "compact");
    expect(parts).toHaveLength(2);
    // The comment line "# A simple example" should be removed
    expect(parts[1]).not.toContain("# A simple example");
    expect(parts[1]).toContain("def factorial");
  });

  it("code-only returns empty array for nodes without code blocks", () => {
    const nodes: ContentNode[] = [
      {
        id: "00000000-0000-0000-0000-000000000010",
        participantId: "user-1",
        content: "Tell me about recursion.",
        order: 0,
      },
    ];
    const parts = filterNodes(nodes, participants, "code-only");
    expect(parts).toHaveLength(0);
  });

  it("user-only skips assistant nodes", () => {
    const parts = filterNodes(makeNodes(), participants, "user-only");
    expect(parts).toHaveLength(1);
    expect(parts[0]).not.toContain("Recursion is when");
  });

  it("full format handles system role nodes", () => {
    const systemParticipants: Participant[] = [
      { id: "system-1", name: "System", role: "system" },
      ...participants,
    ];
    const nodes: ContentNode[] = [
      {
        id: "00000000-0000-0000-0000-000000000010",
        participantId: "system-1",
        content: "You are a helpful assistant.",
        order: 0,
      },
      ...makeNodes(),
    ];
    const parts = filterNodes(nodes, systemParticipants, "full");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toContain("## System");
  });
});
