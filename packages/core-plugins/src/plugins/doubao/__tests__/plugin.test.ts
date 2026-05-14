import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PluginContext } from "../../../types";
import { doubaoPlugin } from "../plugin";

describe("doubaoPlugin", () => {
  describe("urls.match", () => {
    it("matches doubao.com chat URL", () => {
      expect(doubaoPlugin.urls.match("https://www.doubao.com/chat/12345")).toBe(
        true,
      );
    });

    it("matches doubao.com root URL", () => {
      expect(doubaoPlugin.urls.match("https://www.doubao.com/")).toBe(true);
    });

    it("does not match other domains", () => {
      expect(doubaoPlugin.urls.match("https://chat.openai.com/")).toBe(false);
      expect(doubaoPlugin.urls.match("https://doubao.com/")).toBe(false);
    });
  });

  describe("extract", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("throws on non-conversation URL", async () => {
      const ctx: PluginContext = {
        url: "https://www.doubao.com/",
        document: {} as Document,
      };
      await expect(doubaoPlugin.extract(ctx)).rejects.toThrow();
    });

    it("extracts conversation from API responses", async () => {
      const titleResponse = {
        cmd: 1110,
        downlink_body: {
          get_conv_info_downlink_body: {
            conversation_info: { name: "测试对话" },
          },
        },
      };

      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "u1",
                user_type: 1,
                status: 0,
                content_type: 0,
                content: '{"text":"你好"}',
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
              },
              {
                conversation_id: "123",
                message_id: "m2",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "2",
                create_time: "1700000001",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: { text: "你好！有什么可以帮你的？" },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(titleResponse),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/conv_abc-123?foo=bar#history",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);

      expect(bundle.title).toBe("测试对话");
      expect(bundle.participants).toHaveLength(2);
      expect(bundle.nodes).toHaveLength(2);
      expect(bundle.nodes[0]!.content).toBe("你好");
      expect(bundle.nodes[0]!.participantId).toBe("user");
      expect(bundle.nodes[1]!.content).toBe("你好！有什么可以帮你的？");
      expect(bundle.nodes[1]!.participantId).toBe("assistant");
      expect(bundle.source.platform).toBe("doubao");
    });

    it("groups consecutive same-role messages", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: { text_block: { text: "第一段" } },
                  },
                ],
              },
              {
                conversation_id: "123",
                message_id: "m2",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "2",
                create_time: "1700000001",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b2",
                    parent_id: "",
                    content: { text_block: { text: "第二段" } },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      expect(bundle.nodes).toHaveLength(1);
      expect(bundle.nodes[0]!.content).toBe("第一段\n第二段");
    });

    it("handles JSON-encoded user content", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "u1",
                user_type: 1,
                status: 0,
                content_type: 0,
                content: '{"text":"这是用户消息"}',
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      expect(bundle.nodes[0]!.content).toBe("这是用户消息");
    });

    it("paginates when has_more is true", async () => {
      // FETCH_LIMIT is 20 — must return >= 20 messages to trigger pagination
      const makeMessages = (
        startIndex: number,
        count: number,
        userType: number,
      ) =>
        Array.from({ length: count }, (_, i) => ({
          conversation_id: "123",
          message_id: `m${startIndex + i}`,
          sender_id: userType === 1 ? "u1" : "bot1",
          user_type: userType,
          status: 0,
          content_type: 0,
          content: userType === 1 ? `{"text":"msg-${startIndex + i}"}` : "",
          content_status: 0,
          index_in_conv: String(startIndex + i),
          create_time: "1700000000",
          thinking_content: "",
          ...(userType === 2
            ? {
                content_block: [
                  {
                    block_type: 10000,
                    block_id: `b${startIndex + i}`,
                    parent_id: "",
                    content: { text_block: { text: `msg-${startIndex + i}` } },
                  },
                ],
              }
            : {}),
        }));

      // Page 1: indices 21-40 (20 user messages), has_more=true
      const page1 = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: makeMessages(21, 20, 1),
            has_more: true,
          },
        },
      };
      // Page 2: indices 1-20 (20 assistant messages), has_more=false
      const page2 = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: makeMessages(1, 20, 2),
            has_more: false,
          },
        },
      };

      let chainCallCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          chainCallCount++;
          const page = chainCallCount === 1 ? page1 : page2;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(page),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      expect(chainCallCount).toBe(2);
      // 20 assistant messages (indices 1-20) grouped into 1 node,
      // then 20 user messages (indices 21-40) grouped into 1 node
      expect(bundle.nodes).toHaveLength(2);
      expect(bundle.nodes[0]!.participantId).toBe("assistant");
      expect(bundle.nodes[1]!.participantId).toBe("user");
    });

    it("throws on API error response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({ ok: false, status: 500 });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      await expect(doubaoPlugin.extract(ctx)).rejects.toMatchObject({
        code: "E-PARSE-005",
        detail: "Doubao API responded with 500",
      });
    });

    it("falls back to raw content when not JSON", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "u1",
                user_type: 1,
                status: 0,
                content_type: 0,
                content: "纯文本内容",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      expect(bundle.nodes[0]!.content).toBe("纯文本内容");
    });
  });

  describe("fetchById", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches conversation by ID and builds correct URL", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "456",
                message_id: "m1",
                sender_id: "u1",
                user_type: 1,
                status: 0,
                content_type: 0,
                content: '{"text":"fetchById 测试"}',
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  cmd: 1110,
                  downlink_body: {
                    get_conv_info_downlink_body: {
                      conversation_info: { name: "远程对话" },
                    },
                  },
                }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const bundle = await doubaoPlugin.fetchById!("456");

      expect(bundle.title).toBe("远程对话");
      expect(bundle.nodes).toHaveLength(1);
      expect(bundle.nodes[0]!.content).toBe("fetchById 测试");
      expect(bundle.source.url).toBe("https://www.doubao.com/chat/456");
    });
  });

  describe("heading demotion", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("shifts all headings to nest below ## level when content has # H1", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: {
                        text: [
                          "# 一级标题",
                          "正文内容",
                          "## 二级标题",
                          "更多内容",
                          "### 三级标题",
                          "最深内容",
                        ].join("\n"),
                      },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      const content = bundle.nodes[0]!.content;

      // minLevel=1 (#), shift=2 → #→###, ##→####, ###→#####
      expect(content).toContain("### 一级标题");
      expect(content).toContain("#### 二级标题");
      expect(content).toContain("##### 三级标题");
      // No original-level headings left outside fences
      expect(content).toContain("正文内容");
    });

    it("preserves headings inside fenced code blocks", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: {
                        text: [
                          "# 外面标题",
                          "",
                          "```md",
                          "# 代码块内标题不应降级",
                          "## 也不应降级",
                          "```",
                          "",
                          "## 外面小标题",
                        ].join("\n"),
                      },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      const content = bundle.nodes[0]!.content;

      // minLevel=1 (#), shift=2 → #→###, ##→####
      expect(content).toContain("### 外面标题");
      expect(content).toContain("#### 外面小标题");
      // Inside fence preserved
      expect(content).toContain("# 代码块内标题不应降级");
      expect(content).toContain("## 也不应降级");
    });

    it("shifts by 1 when highest heading is ## (level 2)", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: {
                        text: [
                          "## 最高二级",
                          "正文",
                          "### 三级标题",
                          "更多正文",
                        ].join("\n"),
                      },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      const content = bundle.nodes[0]!.content;

      // minLevel=2 (##), shift=1 → ##→###, ###→####
      expect(content).toContain("### 最高二级");
      expect(content).toContain("#### 三级标题");
    });

    it("leaves headings unchanged when already below ## level", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: {
                        text: ["### 三级标题", "正文", "#### 四级标题"].join(
                          "\n",
                        ),
                      },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      const content = bundle.nodes[0]!.content;

      // minLevel=3, shift=0 → unchanged
      expect(content).toContain("### 三级标题");
      expect(content).toContain("#### 四级标题");
    });

    it("leaves 7+ hashes unchanged (not valid ATX headings)", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: {
                        text: ["####### 七个井号不是标题", "## 正常二级"].join(
                          "\n",
                        ),
                      },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      const content = bundle.nodes[0]!.content;

      // minLevel=2 (##), shift=1 → ##→###; 7+ hashes unchanged
      expect(content).toContain("####### 七个井号不是标题");
      expect(content).toContain("### 正常二级");
    });

    it("leaves content unchanged when there are no headings", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: {
                        text: [
                          "这是普通文本",
                          "没有任何标题",
                          "只有段落和换行",
                        ].join("\n"),
                      },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      const content = bundle.nodes[0]!.content;

      // minLevel=Infinity (no headings), shift=0 → completely unchanged
      expect(content).toContain("这是普通文本");
      expect(content).toContain("没有任何标题");
      expect(content).toContain("只有段落和换行");
    });

    it("leaves content unchanged when headings only appear inside code fences", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: {
                        text: [
                          "这是一段说明",
                          "",
                          "```markdown",
                          "# 代码块内的标题",
                          "## 另一个标题",
                          "```",
                          "",
                          "后面也没有标题",
                        ].join("\n"),
                      },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      const content = bundle.nodes[0]!.content;

      // minLevel=Infinity (headings only in fences), shift=0 → unchanged
      expect(content).toContain("# 代码块内的标题");
      expect(content).toContain("## 另一个标题");
      expect(content).toContain("这是一段说明");
    });

    it("caps heading level at 6 when shift would exceed it", async () => {
      const chainResponse = {
        cmd: 3100,
        downlink_body: {
          pull_singe_chain_downlink_body: {
            messages: [
              {
                conversation_id: "123",
                message_id: "m1",
                sender_id: "bot1",
                user_type: 2,
                status: 0,
                content_type: 0,
                content: "",
                content_status: 0,
                index_in_conv: "1",
                create_time: "1700000000",
                thinking_content: "",
                content_block: [
                  {
                    block_type: 10000,
                    block_id: "b1",
                    parent_id: "",
                    content: {
                      text_block: {
                        text: [
                          "# 一级标题",
                          "正文",
                          "##### 五级标题",
                          "更多正文",
                        ].join("\n"),
                      },
                    },
                  },
                ],
              },
            ],
            has_more: false,
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          if (url.includes("/im/conversation/info")) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ cmd: 1110, downlink_body: {} }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(chainResponse),
          });
        }),
      );

      const ctx: PluginContext = {
        url: "https://www.doubao.com/chat/123",
        document: {} as Document,
      };

      const bundle = await doubaoPlugin.extract(ctx);
      const content = bundle.nodes[0]!.content;

      // minLevel=1 (#), shift=2 → #→###, #####→###### (capped at 6, not 7)
      expect(content).toContain("### 一级标题");
      expect(content).toContain("###### 五级标题");
      // Should NOT have 7+ hashes
      expect(content).not.toContain("#######");
    });
  });
});
