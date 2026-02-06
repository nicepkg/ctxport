/**
 * 从嵌套对象中按点号路径提取值。
 * 示例：getByPath({ a: { b: "hello" } }, "a.b") -> "hello"
 */
export function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * URL 模板简单替换。
 * 将 {key} 替换为对应值（自动 encodeURIComponent）。
 */
export function resolveTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(
      new RegExp(`\\{${key}\\}`, "g"),
      encodeURIComponent(value),
    );
  }
  return result;
}
