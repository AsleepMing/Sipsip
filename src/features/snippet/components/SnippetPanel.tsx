import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Check, ClipboardCopy, Edit3, Plus, Search, Send, Trash2, X } from "lucide-react";

interface SnippetEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  use_count: number;
}

interface SnippetPanelProps {
  t: (key: string) => string;
}

const emptyForm = {
  id: 0,
  title: "",
  content: "",
  category: "",
  tagsText: ""
};

const splitTags = (value: string) =>
  value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

const activateWindowFocus = () => {
  invoke("activate_window_focus").catch(console.error);
};

const SnippetPanel = ({ t }: SnippetPanelProps) => {
  const [snippets, setSnippets] = useState<SnippetEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState(emptyForm);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const [items, categoryItems] = await Promise.all([
        invoke<SnippetEntry[]>("list_snippets", { query, category }),
        invoke<string[]>("get_snippet_categories")
      ]);
      setSnippets(items);
      setCategories(categoryItems);
    } catch (err) {
      console.error(err);
      setMessage(String(err));
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  useEffect(() => {
    const unlisten = listen("snippets-changed", () => {
      loadSnippets();
    });
    return () => {
      unlisten.then((off) => off());
    };
  }, [loadSnippets]);

  const openCreate = () => {
    setEditing(emptyForm);
    setShowEditor(true);
    setMessage("");
  };

  const openEdit = (snippet: SnippetEntry) => {
    setEditing({
      id: snippet.id,
      title: snippet.title,
      content: snippet.content,
      category: snippet.category,
      tagsText: snippet.tags.join(", ")
    });
    setShowEditor(true);
    setMessage("");
  };

  const saveSnippet = async () => {
    try {
      await invoke<SnippetEntry>("save_snippet", {
        id: editing.id > 0 ? editing.id : null,
        title: editing.title,
        content: editing.content,
        category: editing.category,
        tags: splitTags(editing.tagsText)
      });
      setShowEditor(false);
      setEditing(emptyForm);
      setMessage(t("saved") || "Saved");
      await loadSnippets();
    } catch (err) {
      console.error(err);
      setMessage(String(err));
    }
  };

  const deleteSnippet = async (id: number) => {
    if (!window.confirm(t("confirm_delete") || "Delete this snippet?")) return;
    try {
      await invoke("delete_snippet", { id });
      await loadSnippets();
    } catch (err) {
      console.error(err);
      setMessage(String(err));
    }
  };

  const copySnippet = async (id: number) => {
    try {
      await invoke("copy_snippet", { id });
      setMessage(t("copied") || "Copied");
      await loadSnippets();
    } catch (err) {
      console.error(err);
      setMessage(String(err));
    }
  };

  const pasteSnippet = async (id: number) => {
    try {
      await invoke("paste_snippet", { id });
      await loadSnippets();
    } catch (err) {
      console.error(err);
      setMessage(String(err));
    }
  };

  const activeCategories = useMemo(() => ["", ...categories], [categories]);

  return (
    <div
      className="snippet-panel window-no-drag"
      onMouseDown={activateWindowFocus}
    >
      <div className="snippet-toolbar">
        <div className="snippet-search-wrap">
          <Search size={14} className="search-icon" />
          <input
            className="search-input"
            value={query}
            placeholder="搜索片段标题、内容、分类或标签..."
            onMouseDown={activateWindowFocus}
            onFocus={activateWindowFocus}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button className="btn-icon" title="新增片段" onClick={openCreate}>
          <Plus size={16} />
        </button>
      </div>

      <div className="snippet-categories hide-scrollbar">
        {activeCategories.map((item) => (
          <button
            key={item || "all"}
            className={`snippet-category ${category === item ? "active" : ""}`}
            onClick={() => setCategory(item)}
          >
            {item || "全部"}
          </button>
        ))}
      </div>

      {message && <div className="snippet-message">{message}</div>}

      {showEditor && (
        <div className="snippet-editor">
          <input
            className="search-input"
            value={editing.title}
            placeholder="片段标题，例如：客服回复 / 邮件签名"
            onMouseDown={activateWindowFocus}
            onFocus={activateWindowFocus}
            onChange={(event) => setEditing((prev) => ({ ...prev, title: event.target.value }))}
          />
          <textarea
            className="snippet-textarea"
            value={editing.content}
            placeholder="输入需要反复复用的文本内容..."
            onMouseDown={activateWindowFocus}
            onFocus={activateWindowFocus}
            onChange={(event) => setEditing((prev) => ({ ...prev, content: event.target.value }))}
          />
          <input
            className="search-input"
            value={editing.category}
            placeholder="分类，例如：工作 / 代码 / 邮件"
            onMouseDown={activateWindowFocus}
            onFocus={activateWindowFocus}
            onChange={(event) => setEditing((prev) => ({ ...prev, category: event.target.value }))}
          />
          <input
            className="search-input"
            value={editing.tagsText}
            placeholder="标签，用逗号分隔"
            onMouseDown={activateWindowFocus}
            onFocus={activateWindowFocus}
            onChange={(event) => setEditing((prev) => ({ ...prev, tagsText: event.target.value }))}
          />
          <div className="snippet-editor-actions">
            <button className="btn-icon" title="取消" onClick={() => setShowEditor(false)}>
              <X size={16} />
            </button>
            <button className="btn-icon active" title="保存" onClick={saveSnippet}>
              <Check size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="snippet-list">
        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : snippets.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontWeight: 700, marginBottom: 4 }}>还没有片段</p>
            <p style={{ opacity: 0.65 }}>点击右上角 + 保存常用回复、命令或模板。</p>
          </div>
        ) : (
          snippets.map((snippet) => (
            <div className="snippet-item" key={snippet.id}>
              <div className="snippet-item-head">
                <div>
                  <div className="snippet-title">{snippet.title}</div>
                  <div className="snippet-meta">
                    {snippet.category || "未分类"} · 使用 {snippet.use_count} 次
                  </div>
                </div>
                <div className="snippet-actions">
                  <button className="btn-icon" title="粘贴" onClick={() => pasteSnippet(snippet.id)}>
                    <Send size={14} />
                  </button>
                  <button className="btn-icon" title="复制" onClick={() => copySnippet(snippet.id)}>
                    <ClipboardCopy size={14} />
                  </button>
                  <button className="btn-icon" title="编辑" onClick={() => openEdit(snippet)}>
                    <Edit3 size={14} />
                  </button>
                  <button className="btn-icon" title="删除" onClick={() => deleteSnippet(snippet.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <pre className="snippet-content">{snippet.content}</pre>
              {snippet.tags.length > 0 && (
                <div className="snippet-tags">
                  {snippet.tags.map((tag) => (
                    <span key={tag} className="tag-chip">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SnippetPanel;
