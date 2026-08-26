# @moonway/meditor

可复用的 React 富文本编辑器，提供段落、字体样式、颜色、背景色、列表、引用、对齐、链接、撤销/重做，并集成 `@moonway/mbox` 选择和上传图片。

```bash
npm install @moonway/meditor @moonway/mbox
```

```tsx
import { createRestMediaLibraryApi } from "@moonway/mbox";
import "@moonway/mbox/styles.css";
import { RichTextEditor } from "@moonway/meditor";
import "@moonway/meditor/styles.css";

const mediaApi = createRestMediaLibraryApi();

export function Editor() {
  return <RichTextEditor name="content" mediaApi={mediaApi} onChange={console.log} />;
}
```

`name` 可选；用于普通表单时会输出同名隐藏字段，也可只使用 `onChange` 获取 HTML。
