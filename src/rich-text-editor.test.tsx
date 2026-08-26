import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichTextEditor } from "./rich-text-editor";

describe("RichTextEditor package", () => {
  it("renders a form-compatible value while exposing a reusable editor label", () => {
    const html = renderToStaticMarkup(
      <RichTextEditor name="description" initialValue="<p>商品详情</p>" ariaLabel="详情编辑器" />,
    );

    expect(html).toContain('name="description"');
    expect(html).toContain('value="&lt;p&gt;商品详情&lt;/p&gt;"');
    expect(html).toContain('aria-label="详情编辑器"');
    expect(html).toContain("图片管理器");
  });

  it("does not rely on unsupported native prompt dialogs", () => {
    const source = readFileSync(new URL("./rich-text-editor.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("window.prompt");
  });

  it("uses consistent vector icons for history and clear-format actions", () => {
    const html = renderToStaticMarkup(<RichTextEditor />);

    expect(html).toContain('data-editor-icon="undo"');
    expect(html).toContain('data-editor-icon="redo"');
    expect(html).toContain('data-editor-icon="clear-format"');
    expect(html).not.toContain("↶");
    expect(html).not.toContain("↷");
  });

  it("exposes a table insertion control", () => {
    const html = renderToStaticMarkup(<RichTextEditor />);

    expect(html).toContain('title="插入表格"');
    expect(html).toContain('data-editor-icon="table"');
  });
});
