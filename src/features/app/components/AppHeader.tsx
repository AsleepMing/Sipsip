import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Image as ImageIcon,
  MessageSquare,
  NotebookText,
  Pin,
  PinOff,
  Search,
  Settings as SettingsIcon,
  Smile,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getTagColor, getTagTextColor } from "../../../shared/lib/utils";
import { APP_NAME } from "../../../shared/config/brand";
import type { ClipboardMode } from "../types";

interface AppHeaderProps {
  t: (key: string) => string;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  showTagManager: boolean;
  setShowTagManager: (val: boolean) => void;
  showSnippetPanel: boolean;
  setShowSnippetPanel: (val: boolean) => void;
  tagManagerEnabled: boolean;
  showEmojiPanel: boolean;
  setShowEmojiPanel: (val: boolean) => void;
  emojiPanelEnabled: boolean;
  chatMode: boolean;
  fileServerEnabled: boolean;
  isWindowPinned: boolean;
  setIsWindowPinned: (val: boolean) => void;
  clearHistory: () => void;
  onClearRecent: (durationMs: number) => void;
  onClearIndexRange: () => void;
  clipboardMode: ClipboardMode;
  onClipboardModeChange: (mode: ClipboardMode) => void;
  showSearchBox: boolean;
  search: string;
  setSearch: (val: string) => void;
  setIsComposing: (val: boolean) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  showTagFilter: boolean;
  setShowTagFilter: (val: boolean) => void;
  allTags: string[];
  searchIsFocused: boolean;
  setSearchIsFocused: (val: boolean) => void;
  setEditingTagsId: (val: number | null) => void;
  theme: string;
  colorMode: string;
  settingsTitle: string;
  typeFilter: string | null;
  setTypeFilter: (val: string | null) => void;
  onBack: () => void;
  onToggleChat: () => void;
  customBackground: string;
  canSetCustomBackground: boolean;
  onChooseBackground: () => void;
}

const AppHeader = ({
  t,
  showSettings,
  setShowSettings,
  showTagManager,
  setShowTagManager,
  showSnippetPanel,
  setShowSnippetPanel,
  tagManagerEnabled,
  showEmojiPanel,
  setShowEmojiPanel,
  emojiPanelEnabled,
  chatMode,
  fileServerEnabled,
  isWindowPinned,
  setIsWindowPinned,
  clearHistory,
  onClearRecent,
  onClearIndexRange,
  clipboardMode,
  onClipboardModeChange,
  showSearchBox,
  search,
  setSearch,
  setIsComposing,
  searchInputRef,
  showTagFilter,
  setShowTagFilter,
  allTags,
  searchIsFocused,
  setSearchIsFocused,
  setEditingTagsId,
  theme,
  colorMode,
  settingsTitle,
  typeFilter,
  setTypeFilter,
  onBack,
  onToggleChat,
  customBackground,
  canSetCustomBackground,
  onChooseBackground
}: AppHeaderProps) => {
  const getTypeName = (type: string) => {
    switch (type) {
      case "code": return t('type_code');
      case "link":
      case "url": return t('type_url');
      case "file": return t('type_file');
      case "image": return t('type_image');
      case "video": return t('type_video');
      case "rich_text": return t('type_rich_text');
      default: return t('type_text') || 'Text';
    }
  };
  const [showCleanupMenu, setShowCleanupMenu] = useState(false);
  const cleanupMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showCleanupMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!cleanupMenuRef.current?.contains(event.target as Node)) {
        setShowCleanupMenu(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [showCleanupMenu]);

  const runCleanupAction = (action: () => void) => {
    setShowCleanupMenu(false);
    action();
  };

  return (
  <header className="window-drag-region">
    <div className="header-top">
      <div className="header-leading">
        {(showSettings || showTagManager || showSnippetPanel || showEmojiPanel) && (
          <button className="btn-icon window-no-drag" onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="header-drag-region" data-tauri-drag-region>
          <span className="header-title">
            {showSnippetPanel
              ? "\u7247\u6bb5\u5e93"
              : showEmojiPanel
              ? (t('emoji_panel') || '表情包')
              : showTagManager && tagManagerEnabled
                ? (t('tag_manager') || '标签管理')
                : showSettings
                  ? settingsTitle
                  : (t('app_name') || APP_NAME)}
          </span>
        </div>
      </div>
      <div className="header-actions window-no-drag">
        {/* Pin Button - Always visible but single instance */}
        <button
          className={`btn-icon ${isWindowPinned ? 'active' : ''}`}
          title={t('pin')}
          onClick={() => {
            const newVal = !isWindowPinned;
            setIsWindowPinned(newVal);
            invoke("set_window_pinned", { pinned: newVal }).catch(console.error);
          }}
        >
          {isWindowPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>

        {!showSettings && !showTagManager && !showSnippetPanel && !showEmojiPanel && (
          <>
            <div className="clipboard-mode-switch" role="group" aria-label={t('clipboard_mode') || 'Clipboard mode'}>
              <button
                className={clipboardMode === 'daily' ? 'active' : ''}
                type="button"
                title={t('clipboard_mode_daily_hint') || 'Daily clipboard mode'}
                onClick={() => onClipboardModeChange('daily')}
              >
                {t('clipboard_mode_daily') || 'Daily'}
              </button>
              <button
                className={clipboardMode === 'work' ? 'active' : ''}
                type="button"
                title={t('clipboard_mode_work_hint') || 'Work clipboard mode'}
                onClick={() => onClipboardModeChange('work')}
              >
                {t('clipboard_mode_work') || 'Work'}
              </button>
            </div>
            <div className="cleanup-menu-anchor" ref={cleanupMenuRef}>
              <button
                className={`btn-icon ${showCleanupMenu ? 'active' : ''}`}
                title={t('clear_history')}
                onClick={() => setShowCleanupMenu((v) => !v)}
              >
                <Trash2 size={16} />
              </button>
              {showCleanupMenu && (
                <div className="cleanup-menu">
                  <button onClick={() => runCleanupAction(() => onClearRecent(60 * 60 * 1000))}>
                    {t('clear_recent_1h') || 'Clear recent 1h'}
                  </button>
                  <button onClick={() => runCleanupAction(() => onClearRecent(24 * 60 * 60 * 1000))}>
                    {t('clear_recent_24h') || 'Clear recent 24h'}
                  </button>
                  <button onClick={() => runCleanupAction(onClearIndexRange)}>
                    {t('clear_by_index_range') || 'Clear by index range'}
                  </button>
                  <button className="danger" onClick={() => runCleanupAction(clearHistory)}>
                    {t('clear_history')}
                  </button>
                </div>
              )}
            </div>
            {tagManagerEnabled && (
              <button className="btn-icon" title={t('tag_manager') || '标签管理'} onClick={() => setShowTagManager(true)}>
                <Tag size={16} />
              </button>
            )}
            <button className="btn-icon" title="\u7247\u6bb5\u5e93" onClick={() => setShowSnippetPanel(true)}>
              <NotebookText size={16} />
            </button>
            {canSetCustomBackground && (
              <button
                className={`btn-icon ${customBackground ? 'active' : ''}`}
                title={customBackground ? (t('change_background') || '更换背景') : (t('choose_background') || '选择背景')}
                onClick={onChooseBackground}
              >
                <ImageIcon size={16} />
              </button>
            )}
            {emojiPanelEnabled && (
              <button className="btn-icon" title={t('emoji_panel') || '表情包'} onClick={() => setShowEmojiPanel(true)}>
                <Smile size={16} />
              </button>
            )}
            <button className="btn-icon" title={t('settings')} onClick={() => setShowSettings(true)}>
              <SettingsIcon size={16} />
            </button>
          </>
        )}
        {fileServerEnabled && (
          <button
            className={`btn-icon header-chat-btn ${chatMode && showSettings ? 'active' : ''}`}
            title="Chat"
            onClick={onToggleChat}
          >
            <MessageSquare size={16} />
          </button>
        )}
        <button className="btn-icon" title={t('hide')} onClick={async () => {
          invoke("hide_window_cmd").catch(console.error);
        }}>
          <X size={16} />
        </button>
      </div>
    </div>

    {!showSettings && !showTagManager && !showSnippetPanel && !showEmojiPanel && (
      <AnimatePresence>
        {(showSearchBox || search.trim().length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{
              height: "auto",
              opacity: 1,
              transitionEnd: { overflow: "visible" }
            }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2, ease: "circOut" }}
            style={{ flexShrink: 0 }}
          >
            <div className="search-container window-no-drag">
              <div style={{ position: 'relative' }}>
                <Search size={14} className="search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={`search-input ${showTagFilter && allTags.length > 0 ? 'dropdown-open' : ''}`}
                  placeholder={t('search_placeholder')}
                  value={search}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={(e) => {
                    setIsComposing(false);
                    setSearch((e.target as HTMLInputElement).value);
                  }}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                  onMouseDown={() => {
                    invoke("activate_window_focus").catch(console.error);
                  }}
                  onClick={() => { setShowTagFilter(true); setEditingTagsId(null); }}
                  onFocus={() => {
                    invoke("activate_window_focus").catch(console.error);
                    setShowTagFilter(true);
                    setSearchIsFocused(true);
                    setEditingTagsId(null);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowTagFilter(false);
                      setSearchIsFocused(false);
                    }, 200);
                  }}
                  style={{ color: colorMode === 'dark' ? '#ffffff' : undefined }}
                />
                {showTagFilter && searchIsFocused && allTags.length > 0 && (
                  <div className="tags-dropdown">
                    <div className="tags-label">{t('tags') || "Tags"}</div>
                    <div className="tags-list">
                      {allTags.map(tag => {
                        const tagBackground = getTagColor(tag, theme);
                        return (
                          <span
                            className="tag-chip"
                            key={tag}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSearch("tag:" + tag);
                              setShowTagFilter(false);
                            }}
                            data-tag={tag}
                            style={{ background: tagBackground, color: getTagTextColor(tagBackground) }}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="hide-scrollbar"
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '8px 0 0 0',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {['text', 'image', 'file', 'url', 'code', 'video', 'rich_text'].map(t => (
                  <button
                    key={t}
                    className={`btn-icon ${typeFilter === t ? 'active' : ''}`}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                    style={{
                      width: 'auto',
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      opacity: typeFilter === t ? 1 : 0.7
                    }}
                    title={getTypeName(t)}
                  >
                    {getTypeName(t)}
                  </button>
                ))}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )}
  </header>
);
};

export default AppHeader;
