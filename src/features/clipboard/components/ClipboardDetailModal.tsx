import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ClipboardCopy, FileText, Save, Search, Send, X } from "lucide-react";
import type { ClipboardEntry } from "../../../shared/types";

interface ClipboardDetailModalProps {
  item: ClipboardEntry | null;
  theme: string;
  onClose: () => void;
  onPaste: (item: ClipboardEntry, content: string) => Promise<void>;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeSnippetTitle = (item: ClipboardEntry, content: string) => {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim())?.trim() || item.preview || "Clipboard snippet";
  return firstLine.slice(0, 48);
};

const ClipboardDetailModal = ({ item, theme, onClose, onPaste }: ClipboardDetailModalProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setLoading(true);
    setMessage("");
    setQuery("");
    invoke<string>("get_clipboard_content", { id: item.id })
      .then((value) => {
        if (!cancelled) setContent(value || item.content || item.preview || "");
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setContent(item.content || item.preview || "");
          setMessage(String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  const matchCount = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return 0;
    return [...content.matchAll(new RegExp(escapeRegex(trimmed), "gi"))].length;
  }, [content, query]);

  if (!item) return null;

  const copyText = async (text: string, successMessage: string) => {
    const value = text.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage(successMessage);
    } catch (err) {
      console.error(err);
      setMessage(String(err));
    }
  };

  const copySelection = async () => {
    const textarea = textRef.current;
    if (!textarea) return;
    const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    await copyText(selected || content, selected ? "已复制选中内容" : "未选中内容，已复制全文");
  };

  const copyAll = async () => {
    await copyText(content, "已复制全文");
  };

  const pasteAll = async () => {
    try {
      await onPaste(item, content);
      onClose();
    } catch (err) {
      console.error(err);
      setMessage(String(err));
    }
  };

  const saveAsSnippet = async () => {
    try {
      await invoke("save_snippet", {
        id: null,
        title: makeSnippetTitle(item, content),
        content,
        category: item.source_app || "剪贴板",
        tags: item.tags || []
      });
      setMessage("已保存为片段");
    } catch (err) {
      console.error(err);
      setMessage(String(err));
    }
  };

  const findNext = () => {
    const textarea = textRef.current;
    const trimmed = query.trim();
    if (!textarea || !trimmed) return;
    const haystack = textarea.value.toLowerCase();
    const needle = trimmed.toLowerCase();
    const start = textarea.selectionEnd || 0;
    let index = haystack.indexOf(needle, start);
    if (index < 0) index = haystack.indexOf(needle, 0);
    if (index >= 0) {
      textarea.focus();
      textarea.setSelectionRange(index, index + trimmed.length);
    }
  };

  return (
    <div className="modal-overlay clipboard-detail-overlay" onMouseDown={onClose}>
      <div className={`clipboard-detail-modal theme-${theme}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="clipboard-detail-header">
          <div>
            <div className="clipboard-detail-title">
              <FileText size={16} />
              全文查看
            </div>
            <div className="clipboard-detail-meta">
              {item.source_app || "Unknown"} · {item.content_type} · {content.length} 字符
            </div>
          </div>
          <button className="btn-icon" title="关闭" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="clipboard-detail-search">
          <div className="clipboard-detail-search-input">
            <Search size={14} className="search-icon" />
            <input
              className="search-input"
              value={query}
              placeholder="在全文中搜索，回车跳到下一处..."
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") findNext();
              }}
            />
          </div>
          <button className="btn-icon" title="查找下一处" onClick={findNext}>
            <Search size={14} />
          </button>
          <span className="clipboard-detail-count">{query.trim() ? `${matchCount} 处` : ""}</span>
        </div>

        <textarea
          ref={textRef}
          className="clipboard-detail-textarea"
          value={loading ? "加载全文中..." : content}
          readOnly
          spellCheck={false}
        />

        {message && <div className="clipboard-detail-message">{message}</div>}

        <div className="clipboard-detail-actions">
          <button className="confirm-dialog-button" onClick={copySelection}>
            <ClipboardCopy size={14} />
            复制选中
          </button>
          <button className="confirm-dialog-button" onClick={copyAll}>
            <ClipboardCopy size={14} />
            复制全文
          </button>
          <button className="confirm-dialog-button" onClick={saveAsSnippet}>
            <Save size={14} />
            存为片段
          </button>
          <button className="confirm-dialog-button primary" onClick={pasteAll}>
            <Send size={14} />
            粘贴全文
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClipboardDetailModal;
