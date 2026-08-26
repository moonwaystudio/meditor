import React from "react";
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
});
