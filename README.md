# @virtual-marketplace/rich-text-editor

可复用的 React 富文本编辑器，提供段落、字体样式、颜色、背景色、列表、引用、对齐、链接、撤销/重做，并集成 `@virtual-marketplace/media-library` 选择和上传图片。

```tsx
import { createRestMediaLibraryApi } from "@virtual-marketplace/media-library";
import "@virtual-marketplace/media-library/styles.css";
import { RichTextEditor } from "@virtual-marketplace/rich-text-editor";
import "@virtual-marketplace/rich-text-editor/styles.css";

const mediaApi = createRestMediaLibraryApi();

export function Editor() {
  return <RichTextEditor name="content" mediaApi={mediaApi} onChange={console.log} />;
}
```

`name` 可选；用于普通表单时会输出同名隐藏字段，也可只使用 `onChange` 获取 HTML。
