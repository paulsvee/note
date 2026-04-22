import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export type BlockType = "line" | "text" | "verse" | "image" | "split";

type FolderRow = {
  id: string;
  name: string;
  description: string;
  sort_order: number;
};

type NoteRow = {
  id: string;
  folder_id: string;
  title: string;
  subtitle: string;
  updated_at: string;
  tags: string;
  sort_order: number;
};

type BlockRow = {
  id: string;
  note_id: string;
  type: BlockType;
  content: string | null;
  caption: string | null;
  left_content: string | null;
  right_content: string | null;
  image_url: string | null;
  color: string | null;
  sort_order: number;
};

let db: Database.Database | null = null;

const DB_PATH = path.join(process.cwd(), "data", "note.sqlite");

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function nowText() {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function seedIfEmpty(database: Database.Database) {
  const row = database.prepare("SELECT COUNT(*) as count FROM folders").get() as { count: number };
  if (row.count > 0) return;

  const timestamp = nowText();
  const insertFolder = database.prepare(`
    INSERT INTO folders (id, name, description, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertNote = database.prepare(`
    INSERT INTO notes (id, folder_id, title, subtitle, tags, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBlock = database.prepare(`
    INSERT INTO blocks (id, note_id, type, content, caption, left_content, right_content, image_url, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ["folder-doctrine", "교리 연구", "주제별로 깊게 공부하는 핵심 폴더", 0],
    ["folder-prayer", "기도와 묵상", "개인 적용과 묵상 정리", 1],
    ["folder-sermon", "설교 정리", "예배 중 받은 인사이트 보관", 2]
  ].forEach(([id, name, description, sortOrder]) => {
    insertFolder.run(id, name, description, sortOrder, timestamp);
  });

  insertNote.run(
    "note-holy-spirit",
    "folder-doctrine",
    "성령",
    "인도하심, 내주하심, 열매, 사역 정리",
    JSON.stringify(["오늘의 주제", "핵심"]),
    0,
    timestamp,
    timestamp
  );
  insertNote.run(
    "note-faith",
    "folder-doctrine",
    "믿음",
    "히브리서 11장 중심 정리",
    JSON.stringify(["누적 연구"]),
    1,
    timestamp,
    timestamp
  );
  insertNote.run(
    "note-prayer",
    "folder-prayer",
    "아침 기도 메모",
    "짧은 한 줄 묵상과 기도 제목",
    JSON.stringify(["묵상"]),
    0,
    timestamp,
    timestamp
  );

  insertBlock.run(
    "block-line-1",
    "note-holy-spirit",
    "line",
    "성령은 단순한 힘이 아니라 인격적으로 역사하시는 하나님이시다.",
    null,
    null,
    null,
    null,
    0,
    timestamp
  );
  insertBlock.run(
    "block-verse-1",
    "note-holy-spirit",
    "verse",
    "요한복음 14:26 | 보혜사 성령께서 모든 것을 가르치시고 생각나게 하신다.",
    null,
    null,
    null,
    null,
    1,
    timestamp
  );
  insertBlock.run(
    "block-text-1",
    "note-holy-spirit",
    "text",
    "<p>오늘 공부 포인트는 세 가지였다.</p><p><u>성령의 인도하심</u>은 감정만이 아니라 말씀과 열매로 분별해야 한다.</p><p>비슷한 주제를 만날 때마다 이 노트에 이어 붙이기 좋게 블록형으로 남긴다.</p>",
    null,
    null,
    null,
    null,
    2,
    timestamp
  );
  insertBlock.run(
    "block-split-1",
    "note-holy-spirit",
    "split",
    null,
    null,
    "<p><strong>관찰</strong></p><p>성령의 열매는 관계 속에서 드러난다.</p>",
    "<p><strong>적용</strong></p><p>오늘 말과 반응에서 오래 참음이 보였는지 점검한다.</p>",
    null,
    3,
    timestamp
  );
  insertBlock.run(
    "block-image-1",
    "note-holy-spirit",
    "image",
    null,
    "말씀 필기 사진이나 캡처 이미지를 붙여 두는 자리",
    null,
    null,
    "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80",
    4,
    timestamp
  );
  insertBlock.run(
    "block-faith-1",
    "note-faith",
    "line",
    "믿음은 불확실함을 미화하는 것이 아니라 하나님의 신실하심을 신뢰하는 태도다.",
    null,
    null,
    null,
    null,
    0,
    timestamp
  );
  insertBlock.run(
    "block-prayer-1",
    "note-prayer",
    "line",
    "오늘도 말씀보다 내 감정이 앞서지 않게 해 주세요.",
    null,
    null,
    null,
    null,
    0,
    timestamp
  );
}

function getDb() {
  if (db) return db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      caption TEXT,
      left_content TEXT,
      right_content TEXT,
      image_url TEXT,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  // 기존 DB에 color 컬럼 없을 경우 마이그레이션
  try {
    db.exec(`ALTER TABLE blocks ADD COLUMN color TEXT`);
  } catch { /* 이미 존재하면 무시 */ }

  seedIfEmpty(db);
  return db;
}

export function getBootstrap() {
  const database = getDb();
  const folders = database.prepare(`
    SELECT id, name, description, sort_order
    FROM folders
    ORDER BY sort_order ASC, created_at ASC
  `).all() as FolderRow[];
  const notes = database.prepare(`
    SELECT id, folder_id, title, subtitle, updated_at, tags, sort_order
    FROM notes
    ORDER BY sort_order ASC, updated_at DESC
  `).all() as NoteRow[];
  const blocks = database.prepare(`
    SELECT id, note_id, type, content, caption, left_content, right_content, image_url, color, sort_order
    FROM blocks
    ORDER BY sort_order ASC, updated_at ASC
  `).all() as BlockRow[];

  return {
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      sortOrder: folder.sort_order
    })),
    notes: notes.map((note) => ({
      id: note.id,
      folderId: note.folder_id,
      title: note.title,
      subtitle: note.subtitle,
      updatedAt: note.updated_at,
      tags: JSON.parse(note.tags) as string[],
      sortOrder: note.sort_order,
      blocks: blocks
        .filter((block) => block.note_id === note.id)
        .map((block) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          caption: block.caption,
          left: block.left_content,
          right: block.right_content,
          imageUrl: block.image_url,
          color: block.color,
          sortOrder: block.sort_order
        }))
    }))
  };
}

export function createFolder(name: string) {
  const database = getDb();
  const id = makeId("folder");
  const next = database.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as value FROM folders").get() as { value: number };
  database.prepare(`
    INSERT INTO folders (id, name, description, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, "새로 만든 주제 폴더", next.value, nowText());
  return id;
}

export function renameFolder(folderId: string, name: string) {
  const database = getDb();
  database.prepare("UPDATE folders SET name = ? WHERE id = ?").run(name, folderId);
}

export function deleteFolder(folderId: string) {
  const database = getDb();
  database.prepare("DELETE FROM folders WHERE id = ?").run(folderId);
}

export function createNote(folderId: string, title: string) {
  const database = getDb();
  const id = makeId("note");
  const next = database.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as value FROM notes WHERE folder_id = ?").get(folderId) as { value: number };
  const timestamp = nowText();
  database.prepare(`
    INSERT INTO notes (id, folder_id, title, subtitle, tags, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, folderId, title, "핵심 공부 내용을 적어보세요.", JSON.stringify(["새 노트"]), next.value, timestamp, timestamp);
  return id;
}

export function updateNote(noteId: string, patch: { title?: string; subtitle?: string; folderId?: string }) {
  const database = getDb();
  const current = database.prepare("SELECT title, subtitle, folder_id FROM notes WHERE id = ?").get(noteId) as { title: string; subtitle: string; folder_id: string } | undefined;
  if (!current) throw new Error("노트를 찾을 수 없습니다.");
  database.prepare(`
    UPDATE notes
    SET title = ?, subtitle = ?, folder_id = ?, updated_at = ?
    WHERE id = ?
  `).run(patch.title ?? current.title, patch.subtitle ?? current.subtitle, patch.folderId ?? current.folder_id, nowText(), noteId);
}

export function createBlock(input: {
  noteId: string;
  type: BlockType;
  content?: string | null;
  caption?: string | null;
  left?: string | null;
  right?: string | null;
  imageUrl?: string | null;
}) {
  const database = getDb();
  const id = makeId("block");
  const next = database.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as value FROM blocks WHERE note_id = ?").get(input.noteId) as { value: number };
  const timestamp = nowText();
  database.prepare(`
    INSERT INTO blocks (id, note_id, type, content, caption, left_content, right_content, image_url, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.noteId,
    input.type,
    input.content ?? null,
    input.caption ?? null,
    input.left ?? null,
    input.right ?? null,
    input.imageUrl ?? null,
    next.value,
    timestamp
  );
  database.prepare("UPDATE notes SET updated_at = ? WHERE id = ?").run(timestamp, input.noteId);
  return id;
}

export function updateBlock(blockId: string, patch: {
  content?: string | null;
  caption?: string | null;
  left?: string | null;
  right?: string | null;
  imageUrl?: string | null;
  color?: string | null;
}) {
  const database = getDb();
  const current = database.prepare(`
    SELECT note_id, content, caption, left_content, right_content, image_url, color
    FROM blocks
    WHERE id = ?
  `).get(blockId) as {
    note_id: string;
    content: string | null;
    caption: string | null;
    left_content: string | null;
    right_content: string | null;
    image_url: string | null;
    color: string | null;
  } | undefined;
  if (!current) throw new Error("블록을 찾을 수 없습니다.");
  const timestamp = nowText();
  database.prepare(`
    UPDATE blocks
    SET content = ?, caption = ?, left_content = ?, right_content = ?, image_url = ?, color = ?, updated_at = ?
    WHERE id = ?
  `).run(
    patch.content ?? current.content,
    patch.caption ?? current.caption,
    patch.left ?? current.left_content,
    patch.right ?? current.right_content,
    patch.imageUrl ?? current.image_url,
    "color" in patch ? patch.color ?? null : current.color,
    timestamp,
    blockId
  );
  database.prepare("UPDATE notes SET updated_at = ? WHERE id = ?").run(timestamp, current.note_id);
}

export function reorderBlocks(noteId: string, orderedBlockIds: string[]) {
  const database = getDb();
  const timestamp = nowText();
  const update = database.prepare("UPDATE blocks SET sort_order = ?, updated_at = ? WHERE id = ? AND note_id = ?");
  const transaction = database.transaction(() => {
    orderedBlockIds.forEach((blockId, index) => {
      update.run(index, timestamp, blockId, noteId);
    });
    database.prepare("UPDATE notes SET updated_at = ? WHERE id = ?").run(timestamp, noteId);
  });
  transaction();
}

export function deleteNote(noteId: string) {
  const database = getDb();
  database.prepare("DELETE FROM notes WHERE id = ?").run(noteId);
}

export function deleteBlock(blockId: string) {
  const database = getDb();
  const row = database.prepare("SELECT note_id, type FROM blocks WHERE id = ?").get(blockId) as { note_id: string; type: string } | undefined;
  if (!row) return;
  database.prepare("DELETE FROM blocks WHERE id = ?").run(blockId);
  database.prepare("UPDATE notes SET updated_at = ? WHERE id = ?").run(nowText(), row.note_id);
  // 이미지 블록 삭제 시 base64 데이터 즉시 회수
  if (row.type === "image") {
    database.exec("VACUUM");
  }
}
