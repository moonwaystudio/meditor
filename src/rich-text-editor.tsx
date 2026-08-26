"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { defaultMediaLibraryApi, MediaIcon, MediaLibraryDialog, MediaLibraryTrigger, type MediaAsset, type MediaLibraryApi } from "@virtual-marketplace/media-library";

function ToolButton({ label, title, onClick, disabled = false }: { label: ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={onClick} disabled={disabled}>{label}</button>;
}

export type RichTextEditorProps = {
  name?: string;
  initialValue?: string;
  ariaLabel?: string;
  placeholder?: string;
  mediaApi?: MediaLibraryApi;
  onChange?: (html: string) => void;
};

export function RichTextEditor({
  name,
  initialValue = "",
  ariaLabel = "富文本编辑器",
  placeholder = "输入内容，也可以从图片管理器插入图片…",
  mediaApi = defaultMediaLibraryApi,
  onChange,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const initialized = useRef(false);
  const [value, setValue] = useState(initialValue);
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [textColor, setTextColor] = useState("#252b37");
  const [backgroundColor, setBackgroundColor] = useState("#fef3c7");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editorRef.current || initialized.current) return;
    editorRef.current.innerHTML = initialValue;
    initialized.current = true;
  }, [initialValue]);

  function syncValue() {
    const nextValue = editorRef.current?.innerHTML ?? "";
    setValue(nextValue);
    onChange?.(nextValue);
  }

  function command(commandName: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(commandName, false, commandValue);
    syncValue();
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    savedRange.current = selection.getRangeAt(0).cloneRange();
  }

  function applyColor(commandName: "foreColor" | "hiliteColor", color: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selection && savedRange.current && editor.contains(savedRange.current.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    document.execCommand("styleWithCSS", false, "true");
    const applied = document.execCommand(commandName, false, color);
    if (!applied && commandName === "hiliteColor") document.execCommand("backColor", false, color);
    saveSelection();
    syncValue();
  }

  function openLibrary() { saveSelection(); setShowLibrary(true); }

  function insertAssets(assets: MediaAsset[]) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    let range = savedRange.current;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
    assets.forEach((asset) => {
      const figure = document.createElement("figure");
      figure.dataset.align = "center";
      const image = document.createElement("img");
      image.src = mediaApi.assetUrl(asset);
      image.alt = asset.name;
      figure.appendChild(image);
      range!.insertNode(figure);
      range!.setStartAfter(figure);
      range!.collapse(true);
    });
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRange.current = range.cloneRange();
    syncValue();
    setShowLibrary(false);
  }

  async function uploadAndInsert(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;
    saveSelection(); setUploading(true); setError("");
    try { insertAssets(await mediaApi.upload(images)); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "图片上传失败"); }
    finally { setUploading(false); }
  }

  function createLink() {
    const value = window.prompt("输入链接地址（http、https 或 mailto）");
    if (!value) return;
    try {
      const url = new URL(value, window.location.origin);
      if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error();
      command("createLink", value);
    } catch { setError("链接地址无效"); }
  }

  function alignBlock(alignment: "left" | "center" | "right") {
    editorRef.current?.focus();
    let anchor = window.getSelection()?.anchorNode;
    let element = anchor instanceof Element ? anchor : anchor?.parentElement;
    let block = element?.closest("p,h2,h3,blockquote,figure") as HTMLElement | null;
    if (!block) {
      document.execCommand("formatBlock", false, "p");
      anchor = window.getSelection()?.anchorNode;
      element = anchor instanceof Element ? anchor : anchor?.parentElement;
      block = element?.closest("p,h2,h3,blockquote,figure") as HTMLElement | null;
    }
    if (block && editorRef.current?.contains(block)) block.dataset.align = alignment;
    syncValue();
  }

  return <div className="rich-text-field">
    <div className="rich-text-editor" onBlur={saveSelection}>
      <div className="rich-text-toolbar" role="toolbar" aria-label="富文本工具栏">
        <MediaLibraryTrigger className="rich-media-button" onMouseDown={(event) => event.preventDefault()} onClick={openLibrary} />
        <label className="rich-upload-button" title="上传到图片管理器并插入"><MediaIcon name="upload" /><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { if (event.target.files) void uploadAndInsert(Array.from(event.target.files)); event.target.value = ""; }} /></label>
        <i />
        <select aria-label="段落格式" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}><option value="p">正文</option><option value="h2">标题 2</option><option value="h3">标题 3</option><option value="blockquote">引用</option></select>
        <i />
        <ToolButton label="B" title="粗体" onClick={() => command("bold")} />
        <ToolButton label="I" title="斜体" onClick={() => command("italic")} />
        <ToolButton label="U" title="下划线" onClick={() => command("underline")} />
        <ToolButton label="S" title="删除线" onClick={() => command("strikeThrough")} />
        <label className="rich-color-control" title="文字颜色"><span>A</span><i style={{ backgroundColor: textColor }} /><input type="color" aria-label="文字颜色" value={textColor} onMouseDown={saveSelection} onChange={(event) => { setTextColor(event.target.value); applyColor("foreColor", event.target.value); }} /></label>
        <label className="rich-color-control rich-background-control" title="文字背景色"><span style={{ backgroundColor }}>A</span><input type="color" aria-label="文字背景色" value={backgroundColor} onMouseDown={saveSelection} onChange={(event) => { setBackgroundColor(event.target.value); applyColor("hiliteColor", event.target.value); }} /></label>
        <i />
        <ToolButton label="•≡" title="无序列表" onClick={() => command("insertUnorderedList")} />
        <ToolButton label="1≡" title="有序列表" onClick={() => command("insertOrderedList")} />
        <ToolButton label="❝" title="引用" onClick={() => command("formatBlock", "blockquote")} />
        <i />
        <ToolButton label={<MediaIcon name="align-left" />} title="左对齐" onClick={() => alignBlock("left")} />
        <ToolButton label={<MediaIcon name="align-center" />} title="居中" onClick={() => alignBlock("center")} />
        <ToolButton label={<MediaIcon name="align-right" />} title="右对齐" onClick={() => alignBlock("right")} />
        <ToolButton label="↗" title="插入链接" onClick={createLink} />
        <ToolButton label="—" title="水平分隔线" onClick={() => command("insertHorizontalRule")} />
        <i />
        <ToolButton label="↶" title="撤销" onClick={() => command("undo")} />
        <ToolButton label="↷" title="重做" onClick={() => command("redo")} />
        <ToolButton label="Tx" title="清除格式" onClick={() => command("removeFormat")} />
      </div>
      <div
        ref={editorRef}
        className="rich-text-canvas"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={syncValue}
        onDrop={(event) => { const files = Array.from(event.dataTransfer.files); if (!files.some((file) => file.type.startsWith("image/"))) return; event.preventDefault(); void uploadAndInsert(files); }}
        onPaste={(event) => { const files = Array.from(event.clipboardData.files); if (files.length) { event.preventDefault(); void uploadAndInsert(files); return; } event.preventDefault(); document.execCommand("insertText", false, event.clipboardData.getData("text/plain")); syncValue(); }}
      />
      <div className="rich-text-status"><span>{uploading ? "图片上传中…" : "支持拖拽或粘贴图片，上传后自动进入图片管理器"}</span><b>{value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length} 字</b></div>
    </div>
    {name ? <input type="hidden" name={name} value={value} /> : null}
    {error ? <div className="form-error" role="alert">{error}</div> : null}
    <MediaLibraryDialog open={showLibrary} description="选择一张或多张图片插入内容" onClose={() => setShowLibrary(false)} libraryProps={{ mode: "picker", onChoose: insertAssets, api: mediaApi }} />
  </div>;
}
