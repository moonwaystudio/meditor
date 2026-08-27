"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { defaultMediaLibraryApi, MediaIcon, MediaLibraryDialog, MediaLibraryTrigger, type MediaAsset, type MediaLibraryApi } from "@moonways/mbox";

const fontSizes = [12, 14, 16, 18, 20, 24, 32, 40] as const;

function ToolButton({ label, title, onClick, disabled = false }: { label: ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={onClick} disabled={disabled}>{label}</button>;
}

function EditorActionIcon({ name }: { name: "undo" | "redo" | "clear-format" | "table" }) {
  return <svg data-editor-icon={name} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "undo" ? <><path d="M7.5 5.25 3.75 9l3.75 3.75" /><path d="M4.25 9h6.25a5 5 0 0 1 5 5v.75" /></> : null}
    {name === "redo" ? <><path d="M12.5 5.25 16.25 9l-3.75 3.75" /><path d="M15.75 9H9.5a5 5 0 0 0-5 5v.75" /></> : null}
    {name === "clear-format" ? <><path d="m5.25 11.25 5.5-6.5 4 3.5-5.5 6.5H6.5z" /><path d="m8.5 7.5 4 3.5" /><path d="M9.25 14.75h6" /></> : null}
    {name === "table" ? <><rect x="3.25" y="4" width="13.5" height="12" rx="1.25" /><path d="M3.25 8h13.5M8 4v12M12.5 4v12" /></> : null}
  </svg>;
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
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [tableHeader, setTableHeader] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fontSize, setFontSize] = useState("");
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

  function restoreSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = savedRange.current;
    if (!editor || !selection || !range || !editor.contains(range.commonAncestorContainer)) return;
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
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

  function applyFontSize(size: string) {
    const editor = editorRef.current;
    if (!editor || !fontSizes.includes(Number(size) as (typeof fontSizes)[number])) return;
    restoreSelection();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");
    editor.querySelectorAll('font[size="7"]').forEach((font) => {
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });
    document.execCommand("styleWithCSS", false, "true");
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

  function openLinkEditor() {
    saveSelection();
    setShowTableEditor(false);
    setLinkValue("");
    setError("");
    setShowLinkEditor(true);
  }

  function createLink() {
    try {
      const source = linkValue.trim();
      if (!source) throw new Error();
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(source) ? source : `https://${source}`);
      if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error();
      restoreSelection();
      document.execCommand("createLink", false, url.href);
      window.getSelection()?.collapseToEnd();
      saveSelection();
      syncValue();
      setShowLinkEditor(false);
      setLinkValue("");
    } catch { setError("链接地址无效"); }
  }

  function openTableEditor() {
    saveSelection();
    setShowLinkEditor(false);
    setShowTableEditor(true);
  }

  function insertTable() {
    const editor = editorRef.current;
    if (!editor) return;
    const rows = Math.min(10, Math.max(1, tableRows));
    const columns = Math.min(10, Math.max(1, tableColumns));
    let range = savedRange.current;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    const table = document.createElement("table");
    const body = document.createElement("tbody");
    let head: HTMLTableSectionElement | null = null;
    if (tableHeader) { head = document.createElement("thead"); table.appendChild(head); }
    table.appendChild(body);
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const row = document.createElement("tr");
      const headerRow = tableHeader && rowIndex === 0;
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const cell = document.createElement(headerRow ? "th" : "td");
        if (headerRow) cell.textContent = `表头 ${columnIndex + 1}`;
        else cell.appendChild(document.createElement("br"));
        row.appendChild(cell);
      }
      (headerRow ? head! : body).appendChild(row);
    }
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    range.deleteContents();
    range.insertNode(table);
    table.after(paragraph);
    const firstCell = table.querySelector("th,td");
    const selection = window.getSelection();
    if (firstCell && selection) {
      const cellRange = document.createRange();
      cellRange.selectNodeContents(firstCell);
      selection.removeAllRanges();
      selection.addRange(cellRange);
      savedRange.current = cellRange.cloneRange();
    }
    syncValue();
    setShowTableEditor(false);
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

  function toggleBlockQuote() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const anchor = window.getSelection()?.anchorNode;
    const element = anchor instanceof Element ? anchor : anchor?.parentElement;
    const blockQuote = element?.closest("blockquote");
    document.execCommand("formatBlock", false, blockQuote && editor.contains(blockQuote) ? "p" : "blockquote");
    syncValue();
  }

  return <div className="rich-text-field">
    <div className="rich-text-editor" onBlur={saveSelection}>
      <div className="rich-text-toolbar" role="toolbar" aria-label="富文本工具栏">
        <MediaLibraryTrigger className="rich-media-button" onMouseDown={(event) => event.preventDefault()} onClick={openLibrary} />
        <label className="rich-upload-button" title="上传到图片管理器并插入"><MediaIcon name="upload" /><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { if (event.target.files) void uploadAndInsert(Array.from(event.target.files)); event.target.value = ""; }} /></label>
        <i />
        <select aria-label="段落格式" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}><option value="p">正文</option><option value="h2">标题 2</option><option value="h3">标题 3</option><option value="blockquote">引用</option></select>
        <select className="rich-font-size-select" aria-label="字体大小" value={fontSize} onMouseDown={saveSelection} onChange={(event) => { setFontSize(event.target.value); applyFontSize(event.target.value); }}><option value="">字号</option>{fontSizes.map((size) => <option value={size} key={size}>{size}px</option>)}</select>
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
        <ToolButton label="❝" title="引用" onClick={toggleBlockQuote} />
        <i />
        <ToolButton label={<MediaIcon name="align-left" />} title="左对齐" onClick={() => alignBlock("left")} />
        <ToolButton label={<MediaIcon name="align-center" />} title="居中" onClick={() => alignBlock("center")} />
        <ToolButton label={<MediaIcon name="align-right" />} title="右对齐" onClick={() => alignBlock("right")} />
        <ToolButton label="↗" title="插入链接" onClick={openLinkEditor} />
        <ToolButton label={<EditorActionIcon name="table" />} title="插入表格" onClick={openTableEditor} />
        <ToolButton label="—" title="水平分隔线" onClick={() => command("insertHorizontalRule")} />
        <i />
        <ToolButton label={<EditorActionIcon name="undo" />} title="撤销" onClick={() => command("undo")} />
        <ToolButton label={<EditorActionIcon name="redo" />} title="重做" onClick={() => command("redo")} />
        <ToolButton label={<EditorActionIcon name="clear-format" />} title="清除格式" onClick={() => command("removeFormat")} />
      </div>
      {showLinkEditor ? <div className="rich-link-editor" role="dialog" aria-label="插入链接">
        <label htmlFor="rich-link-address">链接地址</label>
        <input id="rich-link-address" type="text" autoFocus value={linkValue} onChange={(event) => setLinkValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); createLink(); } if (event.key === "Escape") setShowLinkEditor(false); }} placeholder="https://example.com" />
        <button type="button" onClick={() => setShowLinkEditor(false)}>取消</button>
        <button type="button" className="primary" onClick={createLink}>插入</button>
      </div> : null}
      {showTableEditor ? <div className="rich-table-editor" role="dialog" aria-label="插入表格">
        <label><span>行数</span><input type="number" min="1" max="10" value={tableRows} onChange={(event) => setTableRows(Number(event.target.value))} /></label>
        <label><span>列数</span><input type="number" min="1" max="10" value={tableColumns} onChange={(event) => setTableColumns(Number(event.target.value))} /></label>
        <label className="rich-table-header-option"><input type="checkbox" checked={tableHeader} onChange={(event) => setTableHeader(event.target.checked)} /><span>首行作为表头</span></label>
        <button type="button" onClick={() => setShowTableEditor(false)}>取消</button>
        <button type="button" className="primary" onClick={insertTable}>插入表格</button>
      </div> : null}
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
