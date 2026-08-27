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

  it("exposes a font-size control with explicit pixel sizes", () => {
    const html = renderToStaticMarkup(<RichTextEditor />);

    expect(html).toContain('aria-label="字体大小"');
    expect(html).toMatch(/<option value=""[^>]*>字号<\/option>/);
    expect(html).toContain('<option value="16">16px</option>');
    expect(html).toContain('<option value="32">32px</option>');
  });

  it("exposes a control that clears only the text background", () => {
    const html = renderToStaticMarkup(<RichTextEditor />);
    const source = readFileSync(new URL("./rich-text-editor.tsx", import.meta.url), "utf8");

    expect(html).toContain('aria-label="透明背景"');
    expect(source).toContain('applyColor("hiliteColor", "transparent")');
  });

  it("toggles the current quotation back to a paragraph", () => {
    const source = readFileSync(new URL("./rich-text-editor.tsx", import.meta.url), "utf8");

    expect(source).toMatch(/function toggleBlockQuote[\s\S]+closest\("blockquote"\)[\s\S]+\? "p" : "blockquote"/);
    expect(source).toContain('title="引用" onClick={toggleBlockQuote}');
  });

  it("visually distinguishes links inside the editing canvas", () => {
    const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

    expect(styles).toContain(".rich-text-canvas a");
    expect(styles).toMatch(/\.rich-text-canvas a\s*\{[^}]*text-decoration:\s*underline/s);
  });

  it("reveals the link styling immediately after insertion", () => {
    const source = readFileSync(new URL("./rich-text-editor.tsx", import.meta.url), "utf8");

    expect(source).toMatch(/execCommand\("createLink"[^;]+;\s*window\.getSelection\(\)\?\.collapseToEnd\(\)/s);
  });

  it("uses an explicit JavaScript extension in the ESM package entry", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

    expect(source).toContain('from "./rich-text-editor.js"');
  });
});
