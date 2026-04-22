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
  const insertFolder = database.prepare(`INSERT INTO folders (id, name, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`);
  const insertNote = database.prepare(`INSERT INTO notes (id, folder_id, title, subtitle, tags, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertBlock = database.prepare(`INSERT INTO blocks (id, note_id, type, content, caption, left_content, right_content, image_url, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  insertFolder.run("folder-jobs", "Steve Jobs", "Think. Create. Inspire.", 0, timestamp);
  insertFolder.run("folder-einstein", "Albert Einstein", "Curiosity & Imagination", 1, timestamp);
  insertFolder.run("folder-davinci", "Leonardo da Vinci", "Art Meets Science", 2, timestamp);

  insertNote.run("note-jobs-1", "folder-jobs", "Think Different", "Core philosophy and the creative mindset", JSON.stringify(["philosophy", "creativity"]), 0, timestamp, timestamp);
  insertNote.run("note-jobs-2", "folder-jobs", "Product Design", "Design is not just aesthetics — it is how it works", JSON.stringify(["design"]), 1, timestamp, timestamp);
  insertNote.run("note-einstein-1", "folder-einstein", "On Curiosity", "The fuel behind every great discovery", JSON.stringify(["curiosity", "science"]), 0, timestamp, timestamp);
  insertNote.run("note-einstein-2", "folder-einstein", "Simplicity & Truth", "Elegant expressions of universal laws", JSON.stringify(["simplicity"]), 1, timestamp, timestamp);
  insertNote.run("note-davinci-1", "folder-davinci", "The Renaissance Mind", "Where art and science become one", JSON.stringify(["renaissance", "art"]), 0, timestamp, timestamp);
  insertNote.run("note-davinci-2", "folder-davinci", "Observation & Mastery", "Seeing what others overlook", JSON.stringify(["observation"]), 1, timestamp, timestamp);

  insertBlock.run("block-j1-1", "note-jobs-1", "line", "The only way to do great work is to love what you do.", null, null, null, null, 0, timestamp);
  insertBlock.run("block-j1-2", "note-jobs-1", "verse", "Stanford Commencement, 2005 | Stay hungry. Stay foolish.", null, null, null, null, 1, timestamp);
  insertBlock.run("block-j1-3", "note-jobs-1", "text", "<p>Jobs believed that the intersection of <strong>technology</strong> and the <strong>liberal arts</strong> created something magical. He did not just build products — he built experiences.</p><p>His obsession with simplicity came from a deep belief that complexity is a form of intellectual laziness.</p>", null, null, null, null, 2, timestamp);
  insertBlock.run("block-j1-4", "note-jobs-1", "split", null, null, "<p><strong>Principle</strong></p><p>Focus means saying no to a thousand good ideas.</p>", "<p><strong>Example</strong></p><p>When Jobs returned to Apple, he cut 70% of products to focus on just four.</p>", null, 3, timestamp);

  insertBlock.run("block-j2-1", "note-jobs-2", "line", "Design is not just what it looks like. Design is how it works.", null, null, null, null, 0, timestamp);
  insertBlock.run("block-j2-2", "note-jobs-2", "line", "Creativity is just connecting things.", null, null, null, null, 1, timestamp);
  insertBlock.run("block-j2-3", "note-jobs-2", "text", "<p>Jobs insisted that engineering and design were inseparable. The back of every Mac had to be as beautiful as the front — even if no one would ever see it.</p><p>He once sent a team back to redesign internal circuit boards for aesthetic reasons. <u>Good design goes all the way down.</u></p>", null, null, null, null, 2, timestamp);

  insertBlock.run("block-e1-1", "note-einstein-1", "line", "Imagination is more important than knowledge.", null, null, null, null, 0, timestamp);
  insertBlock.run("block-e1-2", "note-einstein-1", "verse", "Einstein, 1929 | I have no special talents. I am only passionately curious.", null, null, null, null, 1, timestamp);
  insertBlock.run("block-e1-3", "note-einstein-1", "text", "<p>Einstein believed that <u>curiosity</u> was the essential engine of science. He ran thought experiments — imagining himself riding beams of light — long before he had mathematical proof.</p>", null, null, null, null, 2, timestamp);
  insertBlock.run("block-e1-4", "note-einstein-1", "split", null, null, "<p><strong>Thought Experiment</strong></p><p>What would the world look like if you rode alongside a beam of light?</p>", "<p><strong>Insight</strong></p><p>This led directly to the Special Theory of Relativity — time and space are not fixed constants.</p>", null, 3, timestamp);

  insertBlock.run("block-e2-1", "note-einstein-2", "line", "Everything should be made as simple as possible, but not simpler.", null, null, null, null, 0, timestamp);
  insertBlock.run("block-e2-2", "note-einstein-2", "line", "A person who never made a mistake never tried anything new.", null, null, null, null, 1, timestamp);
  insertBlock.run("block-e2-3", "note-einstein-2", "text", "<p>Einstein's genius was not just in complex equations — it was in finding the <strong>simplest</strong> expression of universal truths. E=mc² is elegant precisely because it is brief.</p><p>His method: strip away everything unnecessary until only the essential truth remains.</p>", null, null, null, null, 2, timestamp);

  insertBlock.run("block-d1-1", "note-davinci-1", "line", "Simplicity is the ultimate sophistication.", null, null, null, null, 0, timestamp);
  insertBlock.run("block-d1-2", "note-davinci-1", "line", "Learning never exhausts the mind.", null, null, null, null, 1, timestamp);
  insertBlock.run("block-d1-3", "note-davinci-1", "text", "<p>Da Vinci kept thousands of pages of notebooks — filled with anatomy, engineering, botany, and art. He saw no separation between these disciplines. <strong>Everything was connected.</strong></p>", null, null, null, null, 2, timestamp);
  insertBlock.run("block-d1-4", "note-davinci-1", "verse", "Notebook, ~1490 | The noblest pleasure is the joy of understanding.", null, null, null, null, 3, timestamp);

  insertBlock.run("block-d2-1", "note-davinci-2", "line", "Art is never finished, only abandoned.", null, null, null, null, 0, timestamp);
  insertBlock.run("block-d2-2", "note-davinci-2", "split", null, null, "<p><strong>Observation</strong></p><p>Da Vinci spent years studying water currents, bird wings, and human muscles — not for any project, but for pure understanding.</p>", "<p><strong>Application</strong></p><p>This obsessive study directly informed his paintings, sculptures, and engineering designs centuries ahead of their time.</p>", null, 1, timestamp);
  insertBlock.run("block-d2-3", "note-davinci-2", "text", "<p>He was left-handed, likely dyslexic, and wrote in mirror script — yet produced works of breathtaking precision. His secret: <u>relentless observation and absolute attention to detail</u>.</p>", null, null, null, null, 2, timestamp);
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
