"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ColorImageOverlay from "../components/ColorImageOverlay";

const PALETTE = [
  "#FFEA00", "#00E5FF", "#FF3D00", "#00E676", "#B388FF",
  "#FF80AB", "#FFD180", "#69F0AE", "#82B1FF", "#FFFFFF",
];

type BlockType = "line" | "text" | "verse" | "image" | "split";

type Block = {
  id: string;
  type: BlockType;
  content: string | null;
  caption: string | null;
  left: string | null;
  right: string | null;
  imageUrl: string | null;
  color: string | null;
  sortOrder: number;
};

type TopicFolder = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
};

type StudyNote = {
  id: string;
  folderId: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  tags: string[];
  sortOrder: number;
  blocks: Block[];
};

type BootstrapPayload = {
  folders: TopicFolder[];
  notes: StudyNote[];
};

type InputModalState =
  | { type: "folder"; title: string; placeholder: string; confirmLabel: string; initialValue?: string }
  | { type: "note"; title: string; placeholder: string; confirmLabel: string; initialValue?: string }
  | null;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

const toParagraphs = (value: string) =>
  value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");

export default function Page() {
  const ALL_FOLDER_ID = "all";
  const SELECTED_FOLDER_STORAGE_KEY = "note:selected-folder-id";
  const SELECTED_NOTE_STORAGE_KEY = "note:selected-note-id";
  const [folders, setFolders] = useState<TopicFolder[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [composerText, setComposerText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [inputModal, setInputModal] = useState<InputModalState>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ type: "note" | "folder"; id: string; name: string; folderId?: string } | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerWrapRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dropzoneRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const touchDragRef = useRef<{ blockId: string; pointerId: number } | null>(null);
  const [scrollRequest, setScrollRequest] = useState<{ behavior: "auto" | "smooth" } | null>(null);
  const [scrollReady, setScrollReady] = useState(false);

  const scrollToLatest = (behavior: "auto" | "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, behavior });
  };

  useEffect(() => {
    const composer = composerWrapRef.current;
    if (!composer) return;

    const syncComposerHeight = () => {
      document.documentElement.style.setProperty("--note-composer-height", `${composer.offsetHeight}px`);
    };

    syncComposerHeight();

    const observer = new ResizeObserver(syncComposerHeight);
    observer.observe(composer);

    return () => observer.disconnect();
  }, []);

  const refreshData = async (
    preferNoteId?: string,
    preferFolderId?: string,
    options?: { quiet?: boolean }
  ) => {
    if (!options?.quiet) setLoading(true);
    setError("");
    try {
      const payload = await fetchJson<BootstrapPayload>("/api/bootstrap");
      setFolders(payload.folders);
      setNotes(payload.notes);

      const nextFolderId = preferFolderId || selectedFolderId || ALL_FOLDER_ID;
      const notesInFolder = nextFolderId === ALL_FOLDER_ID
        ? payload.notes
        : payload.notes.filter((note) => note.folderId === nextFolderId);
      const nextNoteId = preferNoteId || selectedNoteId || notesInFolder[0]?.id || payload.notes[0]?.id || "";

      setSelectedFolderId(nextFolderId);
      setSelectedNoteId(nextNoteId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "데이터를 불러오지 못했습니다.");
    } finally {
      if (!options?.quiet) setLoading(false);
    }
  };

  const setDropzoneRef = (index: number, node: HTMLDivElement | null) => {
    if (node) dropzoneRefs.current.set(index, node);
    else dropzoneRefs.current.delete(index);
  };

  const getNearestDropIndex = (clientY: number) => {
    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    dropzoneRefs.current.forEach((node, index) => {
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  };

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(target.closest("button, input, textarea, label, a, [contenteditable='true']"));

  useEffect(() => {
    const savedFolderId = window.localStorage.getItem(SELECTED_FOLDER_STORAGE_KEY) ?? undefined;
    const savedNoteId = window.localStorage.getItem(SELECTED_NOTE_STORAGE_KEY) ?? undefined;
    void refreshData(savedNoteId, savedFolderId);
  }, []);

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  const filteredNotes = useMemo(
    () => selectedFolderId === ALL_FOLDER_ID
      ? notes
      : notes.filter((note) => note.folderId === selectedFolder?.id),
    [notes, selectedFolder, selectedFolderId]
  );

  const searchedNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredNotes;
    return filteredNotes.filter((note) => {
      const blockText = note.blocks
        .map((b) => [b.content, b.caption, b.left, b.right].filter(Boolean).join(" "))
        .join(" ")
        .replace(/<[^>]+>/g, "");
      return `${note.title} ${note.subtitle} ${blockText}`.toLowerCase().includes(query);
    });
  }, [filteredNotes, searchQuery]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? filteredNotes[0],
    [notes, selectedNoteId, filteredNotes]
  );

  useEffect(() => {
    if (selectedFolderId !== ALL_FOLDER_ID && selectedFolder && selectedFolder.id !== selectedFolderId) {
      setSelectedFolderId(selectedFolder.id);
    }
  }, [selectedFolder, selectedFolderId, ALL_FOLDER_ID]);

  useEffect(() => {
    if (selectedNote && selectedNote.id !== selectedNoteId) setSelectedNoteId(selectedNote.id);
  }, [selectedNote, selectedNoteId]);

  useEffect(() => {
    if (!selectedFolderId) return;
    window.localStorage.setItem(SELECTED_FOLDER_STORAGE_KEY, selectedFolderId);
  }, [selectedFolderId]);

  useEffect(() => {
    if (!selectedNoteId) return;
    window.localStorage.setItem(SELECTED_NOTE_STORAGE_KEY, selectedNoteId);
  }, [selectedNoteId]);

  useLayoutEffect(() => {
    if (!scrollRequest) return;
    scrollToLatest(scrollRequest.behavior);
    setScrollRequest(null);
    setScrollReady(true);
  }, [scrollRequest, selectedNote?.id, selectedNote?.blocks.length]);

  useEffect(() => {
    if (!selectedNote?.id) return;
    setScrollReady(false);
    setScrollRequest({ behavior: "auto" });
  }, [selectedNote?.id]);

  const setNotePatch = (noteId: string, patch: Partial<StudyNote>) => {
    setNotes((current) => current.map((note) => (note.id === noteId ? { ...note, ...patch } : note)));
  };

  const saveNoteMeta = async (patch: { title?: string; subtitle?: string }) => {
    if (!selectedNote) return;
    await fetchJson(`/api/notes/${selectedNote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    await refreshData(selectedNote.id, selectedNote.folderId);
  };

  const addFolder = async () => {
    setInputModal({
      type: "folder",
      title: "새 폴더",
      placeholder: "폴더 이름",
      confirmLabel: "만들기"
    });
  };

  const createFolderFromModal = async (name: string) => {
    const result = await fetchJson<{ folderId: string }>("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    await refreshData(undefined, result.folderId);
  };

  const addNote = async () => {
    const targetFolder = selectedFolder ?? folders[0];
    if (!targetFolder) return;
    setInputModal({
      type: "note",
      title: "새 노트",
      placeholder: "노트 이름",
      confirmLabel: "만들기"
    });
  };

  const doDeleteNote = async (noteId: string) => {
    await fetchJson(`/api/notes/${noteId}`, { method: "DELETE" });
    const wasSelected = selectedNoteId === noteId;
    await refreshData(wasSelected ? undefined : selectedNoteId, selectedFolderId);
  };

  const doRenameNote = async (noteId: string, name: string, folderId?: string) => {
    await fetchJson(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name, folderId })
    });
    await refreshData(noteId, folderId ?? selectedFolderId);
  };

  const doRenameFolder = async (folderId: string, name: string) => {
    await fetchJson(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    await refreshData(selectedNoteId, folderId);
  };

  const doDeleteFolder = async (folderId: string) => {
    await fetchJson(`/api/folders/${folderId}`, { method: "DELETE" });
    await refreshData(undefined, ALL_FOLDER_ID);
  };

  const createNoteFromModal = async (title: string) => {
    const targetFolder = selectedFolder ?? folders[0];
    if (!targetFolder) return;
    const result = await fetchJson<{ noteId: string }>("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: targetFolder.id, title })
    });
    await refreshData(result.noteId, targetFolder.id);
  };

  const fromParagraphHtml = (value: string | null) =>
    (value ?? "")
      .replace(/<p>/gi, "")
      .replace(/<\/p>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim();

  const addBlock = async (override?: { imageUrl?: string }) => {
    if (!selectedNote) return;
    const trimmedText = composerText.trim();
    const container = scrollContainerRef.current;
    const isNearBottom = container ? container.scrollTop < 64 : false;

    const payload: Record<string, string | null> = {
      noteId: selectedNote.id,
      type: "text",
      content: null,
      caption: null,
      left: null,
      right: null,
      imageUrl: null
    };

    if (override?.imageUrl) {
      payload.type = "image";
      payload.imageUrl = override.imageUrl;
      payload.caption = trimmedText || null;
    } else {
      if (!trimmedText) return;
      const splitParts = trimmedText.split("||").map((part) => part.trim());
      if (splitParts.length >= 2 && splitParts[0] && splitParts.slice(1).join(" ").trim()) {
        payload.type = "split";
        payload.left = toParagraphs(splitParts[0]);
        payload.right = toParagraphs(splitParts.slice(1).join(" || "));
      } else {
        payload.content = toParagraphs(trimmedText);
      }
    }

    try {
      await fetchJson("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setComposerText("");
      await refreshData(selectedNote.id, selectedNote.folderId, { quiet: true });
      setScrollRequest({ behavior: isNearBottom ? "auto" : "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "메모를 저장하지 못했습니다.");
    }
  };

  const updateBlock = async (blockId: string, patch: Partial<Block>) => {
    if (!selectedNote) return;
    await fetchJson(`/api/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    await refreshData(selectedNote.id, selectedNote.folderId, { quiet: true });
  };

  const updateBlockColor = async (blockId: string, color: string | null) => {
    if (!selectedNote) return;
    setNotes((current) =>
      current.map((note) =>
        note.id === selectedNote.id
          ? { ...note, blocks: note.blocks.map((b) => b.id === blockId ? { ...b, color } : b) }
          : note
      )
    );
    await fetchJson(`/api/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color })
    });
  };

  const toEditableText = (block: Block) => {
    if (block.type === "split") {
      return `${fromParagraphHtml(block.left)}\n||\n${fromParagraphHtml(block.right)}`.trim();
    }
    if (!block.content) return "";
    if (block.type !== "text") return block.content;
    return fromParagraphHtml(block.content);
  };

  const toStoredBlockPatch = (block: Block, value: string): Partial<Block> => {
    if (block.type === "split") {
      const parts = value.split("||").map((part) => part.trim());
      return {
        left: toParagraphs(parts[0] ?? ""),
        right: toParagraphs(parts.slice(1).join(" || "))
      };
    }
    if (block.type !== "text") return { content: value.trim() };
    return { content: toParagraphs(value) };
  };

  const startEditingBlock = (block: Block) => {
    if (block.type === "image") return;
    setEditingBlockId(block.id);
    setEditingValue(toEditableText(block));
  };

  const commitEditingBlock = async (block: Block) => {
    if (editingBlockId !== block.id) return;
    setEditingBlockId(null);
    await updateBlock(block.id, toStoredBlockPatch(block, editingValue));
  };

  useEffect(() => {
    if (!editingBlockId || !editingTextareaRef.current) return;
    const textarea = editingTextareaRef.current;
    const end = textarea.value.length;
    textarea.focus();
    textarea.setSelectionRange(end, end);
  }, [editingBlockId]);

  const deleteBlock = async (blockId: string) => {
    if (!selectedNote) return;
    const container = scrollContainerRef.current;
    const savedScrollTop = container?.scrollTop ?? 0;
    await fetchJson(`/api/blocks/${blockId}`, { method: "DELETE" });
    await refreshData(selectedNote.id, selectedNote.folderId, { quiet: true });
    if (container) container.scrollTop = savedScrollTop;
  };

  const reorderBlocks = async (orderedBlockIds: string[]) => {
    if (!selectedNote) return;
    await fetchJson("/api/blocks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteId: selectedNote.id,
        orderedBlockIds
      })
    });
    await refreshData(selectedNote.id, selectedNote.folderId);
  };

  const handleDrop = async (insertIndex: number) => {
    if (!selectedNote || !draggingId) return;
    const ordered = selectedNote.blocks.map((block) => block.id).filter((id) => id !== draggingId);
    ordered.splice(insertIndex, 0, draggingId);
    setDraggingId(null);
    setDropIndex(null);
    await reorderBlocks(ordered);
  };

  const startTouchReorder = (event: React.PointerEvent<HTMLElement>, blockId: string, index: number) => {
    if (event.pointerType !== "touch" || editingBlockId || isInteractiveTarget(event.target)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    touchDragRef.current = { blockId, pointerId: event.pointerId };
    setDraggingId(blockId);
    setDropIndex(index);
  };

  const moveTouchReorder = (event: React.PointerEvent<HTMLElement>) => {
    const active = touchDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const nextIndex = getNearestDropIndex(event.clientY);
    if (nextIndex !== null) setDropIndex(nextIndex);
  };

  const finishTouchReorder = (event: React.PointerEvent<HTMLElement>) => {
    const active = touchDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    touchDragRef.current = null;
    const targetIndex = dropIndex;
    if (targetIndex === null) {
      setDraggingId(null);
      setDropIndex(null);
      return;
    }
    void handleDrop(targetIndex);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => void addBlock({ imageUrl: String(reader.result) });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="note-shell">
      {imagePreviewUrl && (
        <ImagePreview
          urls={selectedNote?.blocks.filter((b) => b.imageUrl).map((b) => b.imageUrl!) ?? [imagePreviewUrl]}
          initialUrl={imagePreviewUrl}
          onClose={() => setImagePreviewUrl(null)}
        />
      )}
      {sidebarOpen ? <div className="psv-sidebar-dim" onClick={() => setSidebarOpen(false)} /> : null}
      {inputModal ? (
        <InputModal
          title={inputModal.title}
          placeholder={inputModal.placeholder}
          confirmLabel={inputModal.confirmLabel}
          initialValue={inputModal.initialValue ?? ""}
          onCancel={() => setInputModal(null)}
          onConfirm={async (value) => {
            const modal = inputModal;
            setInputModal(null);
            if (modal.type === "folder") await createFolderFromModal(value);
            if (modal.type === "note") await createNoteFromModal(value);
          }}
        />
      ) : null}
      {editTarget ? (
        <EditModal
          target={editTarget}
          folders={folders}
          onClose={() => setEditTarget(null)}
          onRename={async (name, folderId) => {
            const t = editTarget;
            setEditTarget(null);
            if (t.type === "note") await doRenameNote(t.id, name, folderId);
            else await doRenameFolder(t.id, name);
          }}
          onDelete={async () => {
            const t = editTarget;
            setEditTarget(null);
            if (t.type === "note") await doDeleteNote(t.id);
            else await doDeleteFolder(t.id);
          }}
        />
      ) : null}
      {deleteTargetId ? (
        <div className="note-confirm-overlay" onClick={() => setDeleteTargetId(null)}>
          <div className="note-confirm-box" onClick={(event) => event.stopPropagation()}>
            <div className="note-confirm-title">삭제할까요?</div>
            <div className="note-confirm-copy">이 블록은 삭제하면 바로 사라집니다.</div>
            <div className="note-confirm-actions">
              <button className="note-confirm-cancel" onClick={() => setDeleteTargetId(null)}>취소</button>
              <button
                className="note-confirm-delete"
                onClick={async () => {
                  const id = deleteTargetId;
                  setDeleteTargetId(null);
                  if (id) await deleteBlock(id);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className={`psv-sidebar${sidebarOpen ? " psv-sidebar--open" : ""}`}>
        <div className="note-list-pane">
          <div className="note-sidebar-brand">
            <div className="psv-brand">
              <div className="note-sidebar-title">Note</div>
              <div className="note-sidebar-subtitle">한줄 메모장</div>
            </div>
            <button
              className="note-sidebar-brand-action"
              type="button"
              aria-label="사이드바 닫기"
              onClick={() => setSidebarOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14.5 6.5 9 12l5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="note-list-search">
            <div className="note-search-row">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search"
              />
              <div className="note-search-menu-wrap">
                <button
                  className="note-search-menu-btn"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                {menuOpen ? (
                  <>
                    <div className="note-search-menu-backdrop" onClick={() => setMenuOpen(false)} />
                    <div className="note-search-dropdown">
                      <button onClick={() => { setMenuOpen(false); void addFolder(); }}>폴더 추가</button>
                      <button onClick={() => { setMenuOpen(false); void addNote(); }}>리스트 추가</button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="note-list-head">
            <div className="note-folder-tabs">
              <button
                className={`note-chip${selectedFolderId === ALL_FOLDER_ID ? " active" : ""}`}
                onClick={() => {
                  setSelectedFolderId(ALL_FOLDER_ID);
                  setSearchQuery("");
                }}
              >
                <span className="note-chip-label">All</span>
                <span className="note-chip-count">{notes.length}</span>
              </button>

              {folders.map((folder) => {
                const count = notes.filter((note) => note.folderId === folder.id).length;
                return (
                  <button
                    key={folder.id}
                    className={`note-chip${folder.id === selectedFolder?.id ? " active" : ""}`}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setSearchQuery("");
                    }}
                    onDoubleClick={() => setEditTarget({ type: "folder", id: folder.id, name: folder.name })}
                  >
                    <span className="note-chip-label">{folder.name}</span>
                    <span className="note-chip-count">{count}</span>
                  </button>
                );
              })}

            </div>
          </div>

          <div className="note-chat-list">
            {searchedNotes.map((note, index) => {
              const lastBlock = note.blocks[note.blocks.length - 1];
              const preview = lastBlock
                ? (lastBlock.type === "image"
                    ? (lastBlock.caption ?? "이미지")
                    : (lastBlock.content ?? lastBlock.left ?? lastBlock.right ?? "")
                        .replace(/<[^>]+>/g, "").trim())
                : "";
              return (
                <div
                  key={note.id}
                  className={`note-chat-row${note.id === selectedNote?.id ? " active" : ""}`}
                  onDoubleClick={() => setEditTarget({ type: "note", id: note.id, name: note.title, folderId: note.folderId })}
                >
                  <button
                    className="note-chat-row-main"
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <span
                      className="note-sidebar-avatar"
                      style={{ background: index % 2 === 0 ? "linear-gradient(135deg,#6ba3ff,#4d63db)" : "linear-gradient(135deg,#9c7dff,#5a78ff)" }}
                    >
                      {note.title.slice(0, 1)}
                    </span>
                    <span className="note-chat-copy">
                      <strong>{note.title}</strong>
                      {preview ? <small>{preview}</small> : null}
                    </span>
                    <span className="note-chat-meta">
                      <em>{note.updatedAt.slice(5)}</em>
                      <b>{note.blocks.length}</b>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="note-main">
        <header className="note-topbar">
          <div className="note-topbar-copy">
            <input
              className="note-title-input"
              value={selectedNote?.title ?? ""}
              onChange={(event) => {
                if (selectedNote) setNotePatch(selectedNote.id, { title: event.target.value });
              }}
              onBlur={(event) => void saveNoteMeta({ title: event.target.value })}
            />
            {selectedNote && (
              <div className="note-title-count">{selectedNote.blocks.length}개</div>
            )}
          </div>
        </header>

        <div className="note-viewpane">
        <div className={`note-scroll${scrollReady ? " ready" : ""}`} ref={scrollContainerRef}>
          {error ? <div className="note-error">{error}</div> : null}

          {loading ? (
            <div className="note-empty">SQLite에서 노트를 불러오는 중입니다.</div>
          ) : selectedNote?.blocks.length ? (
            <div className="note-thread">
              {[...selectedNote.blocks].reverse().map((block, reversedIndex) => {
                const index = selectedNote.blocks.length - 1 - reversedIndex;
                return (
                <div key={block.id}>
                  <div
                    ref={(node) => setDropzoneRef(index, node)}
                    className={`note-dropzone${dropIndex === index ? " active" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDrop(index);
                    }}
                  />

                  <article
                    className={`note-bubble ${block.type}${editingBlockId === block.id ? " editing" : ""}${draggingId === block.id ? " dragging" : ""}`}
                    draggable
                    onDragStart={() => setDraggingId(block.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropIndex(null);
                    }}
                    onPointerDown={(event) => startTouchReorder(event, block.id, index)}
                    onPointerMove={moveTouchReorder}
                    onPointerUp={finishTouchReorder}
                    onPointerCancel={() => {
                      touchDragRef.current = null;
                      setDraggingId(null);
                      setDropIndex(null);
                    }}
                    style={block.color ? { borderColor: `${block.color}99`, background: `linear-gradient(var(--pill-overlay), var(--pill-overlay)), ${block.color}` } : undefined}
                  >
                    <ColorImageOverlay
                      open={openMenuBlockId === block.id}
                      currentColor={block.color}
                      palette={PALETTE}
                      onPickColor={(c) => { void updateBlockColor(block.id, c); }}
                      onDelete={() => setDeleteTargetId(block.id)}
                      onClose={() => setOpenMenuBlockId(null)}
                    />

                    {(block.type === "line" || block.type === "verse" || block.type === "text" || block.type === "split") && editingBlockId === block.id ? (
                      <textarea
                        ref={editingTextareaRef}
                        className={`note-edit-area ${block.type === "text" || block.type === "split" ? "rich" : ""}`}
                        value={editingValue}
                        onChange={(event) => setEditingValue(event.target.value)}
                        onBlur={() => void commitEditingBlock(block)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setEditingBlockId(null);
                            setEditingValue("");
                          }
                          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                            event.preventDefault();
                            void commitEditingBlock(block);
                          }
                        }}
                      />
                    ) : null}

                    {(block.type === "line" || block.type === "verse") && editingBlockId !== block.id && (
                      <div className="note-bubble-inline">
                        <div
                          className={`note-display-text ${block.type}`}
                          onDoubleClick={() => startEditingBlock(block)}
                        >
                          {block.content}
                        </div>
                        <button
                          className="note-bubble-dots"
                          aria-label="메뉴"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuBlockId(block.id); }}
                          style={block.color ? { color: block.color } : undefined}
                        >⋮</button>
                      </div>
                    )}

                    {block.type === "text" && editingBlockId !== block.id && (
                      <div className="note-bubble-inline">
                        <div
                          className="note-display-text rich"
                          onDoubleClick={() => startEditingBlock(block)}
                          dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
                        />
                        <button
                          className="note-bubble-dots"
                          aria-label="메뉴"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuBlockId(block.id); }}
                          style={block.color ? { color: block.color } : undefined}
                        >⋮</button>
                      </div>
                    )}

                    {block.type === "split" && editingBlockId !== block.id && (
                      <div className="note-split-grid">
                        <div
                          className="note-display-text rich note-split-panel"
                          onDoubleClick={() => startEditingBlock(block)}
                          dangerouslySetInnerHTML={{ __html: block.left ?? "" }}
                        />
                        <div
                          className="note-display-text rich note-split-panel"
                          onDoubleClick={() => startEditingBlock(block)}
                          dangerouslySetInnerHTML={{ __html: block.right ?? "" }}
                        />
                        <button
                          className="note-bubble-dots note-split-dots"
                          aria-label="메뉴"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuBlockId(block.id); }}
                          style={block.color ? { color: block.color } : undefined}
                        >⋮</button>
                      </div>
                    )}

                    {block.type === "image" && (
                      <div className="note-image-wrap">
                        {block.imageUrl
                          ? <img
                              src={block.imageUrl}
                              alt={block.caption ?? "note image"}
                              className="note-image-img"
                              onLoad={(e) => {
                                const img = e.currentTarget;
                                const w = Math.min(img.naturalWidth * 0.5, 320);
                                img.style.width = `${w}px`;
                                img.style.height = "auto";
                              }}
                              onClick={() => setImagePreviewUrl(block.imageUrl)}
                            />
                          : null}
                        <button
                          className="note-image-dots"
                          aria-label="메뉴"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuBlockId(block.id); }}
                        >⋮</button>
                      </div>
                    )}
                  </article>
                </div>
              );})}

              <div
                ref={(node) => setDropzoneRef(selectedNote.blocks.length, node)}
                className={`note-dropzone${dropIndex === selectedNote.blocks.length ? " active" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropIndex(selectedNote.blocks.length);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleDrop(selectedNote.blocks.length);
                }}
              />
            </div>
          ) : null}
        </div>
        </div>

        <footer className="note-composer-wrap" ref={composerWrapRef}>
          <div className="psv-input-bar note-composer-bar">
            <input
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addBlock();
                }
              }}
              onPaste={(event) => {
                const items = event.clipboardData?.items;
                if (!items) return;
                for (const item of Array.from(items)) {
                  if (item.type.startsWith("image/")) {
                    event.preventDefault();
                    const file = item.getAsFile();
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => void addBlock({ imageUrl: String(reader.result) });
                    reader.readAsDataURL(file);
                    return;
                  }
                }
              }}
              placeholder="메모 입력, split은 왼쪽 || 오른쪽"
            />

            <label className="note-upload-btn">
              이미지
              <input type="file" accept="image/*" hidden onChange={onFileChange} />
            </label>

            <button className="note-send-btn" onClick={() => void addBlock()}>
              추가
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function ImagePreview({ urls, initialUrl, onClose }: { urls: string[]; initialUrl: string; onClose: () => void }) {
  const [index, setIndex] = useState(() => {
    const i = urls.indexOf(initialUrl);
    return i >= 0 ? i : 0;
  });

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(urls.length - 1, i + 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const url = urls[index];

  return (
    <div className="note-image-preview-overlay" onClick={onClose}>
      {index > 0 && (
        <button className="note-preview-nav note-preview-nav--prev" onClick={(e) => { e.stopPropagation(); prev(); }}>‹</button>
      )}
      <img src={url} alt="preview" className="note-image-preview-img" onClick={(e) => e.stopPropagation()} />
      {index < urls.length - 1 && (
        <button className="note-preview-nav note-preview-nav--next" onClick={(e) => { e.stopPropagation(); next(); }}>›</button>
      )}
    </div>
  );
}

function InputModal({
  title,
  placeholder,
  confirmLabel,
  initialValue = "",
  onConfirm,
  onCancel
}: {
  title: string;
  placeholder: string;
  confirmLabel: string;
  initialValue?: string;
  onConfirm: (value: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="note-confirm-overlay" onClick={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <div className="note-prompt-box" onClick={(event) => event.stopPropagation()}>
        <div className="note-prompt-title">{title}</div>
        <input
          className="note-prompt-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          autoFocus
          maxLength={40}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
            if (event.key === "Enter" && value.trim()) void onConfirm(value.trim());
          }}
        />
        <div className="note-confirm-actions">
          <button className="note-confirm-cancel" onClick={onCancel}>취소</button>
          <button
            className="note-prompt-confirm"
            disabled={!value.trim()}
            onClick={() => value.trim() && void onConfirm(value.trim())}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  target,
  folders,
  onClose,
  onRename,
  onDelete
}: {
  target: { type: "note" | "folder"; id: string; name: string; folderId?: string };
  folders: { id: string; name: string }[];
  onClose: () => void;
  onRename: (name: string, folderId?: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [value, setValue] = useState(target.name);
  const [selectedFolderId, setSelectedFolderId] = useState(target.folderId ?? "");
  const label = target.type === "folder" ? "폴더" : "리스트";

  return (
    <div className="note-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="note-prompt-box" onClick={(e) => e.stopPropagation()}>
        <div className="note-prompt-title">{label} 편집</div>
        <input
          className="note-prompt-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          maxLength={40}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && value.trim()) void onRename(value.trim(), selectedFolderId || undefined);
          }}
        />
        {target.type === "note" && folders.length > 0 ? (
          <div className="note-edit-folder-section">
            <div className="note-edit-folder-label">폴더</div>
            <div className="note-edit-folder-pills">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className={`note-edit-folder-pill${selectedFolderId === folder.id ? " active" : ""}`}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="note-edit-modal-actions">
          <button className="note-confirm-delete" onClick={() => void onDelete()}>삭제</button>
          <div className="note-edit-modal-right">
            <button className="note-confirm-cancel" onClick={onClose}>취소</button>
            <button
              className="note-prompt-confirm"
              disabled={!value.trim()}
              onClick={() => value.trim() && void onRename(value.trim(), selectedFolderId || undefined)}
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
