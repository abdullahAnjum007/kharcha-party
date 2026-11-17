import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import BetterSqlite3 from 'better-sqlite3';

export class Database {
  readonly raw: BetterSqlite3.Database;

  constructor(databasePath: string) {
    if (databasePath !== ':memory:') {
      const absolutePath = resolve(databasePath);
      mkdirSync(dirname(absolutePath), { recursive: true });
      this.raw = new BetterSqlite3(absolutePath);
    } else {
      this.raw = new BetterSqlite3(':memory:');
    }

    this.raw.pragma('foreign_keys = ON');
    this.raw.pragma('busy_timeout = 5000');
    if (databasePath !== ':memory:') this.raw.pragma('journal_mode = WAL');
    this.migrate();
  }

  transaction<T>(work: () => T): T {
    return this.raw.transaction(work)();
  }

  close() {
    if (this.raw.open) this.raw.close();
  }

  private migrate() {
    this.raw.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SETTLED')),
        leader_id TEXT,
        voting_round INTEGER NOT NULL DEFAULT 1,
        budget_mode TEXT NOT NULL DEFAULT 'UNDECIDED' CHECK(budget_mode IN ('UNDECIDED', 'DECIDED', 'FLEXIBLE')),
        budget_status TEXT NOT NULL DEFAULT 'UNSET' CHECK(budget_status IN ('UNSET', 'PROPOSED', 'LOCKED')),
        individual_budget INTEGER NOT NULL DEFAULT 0 CHECK(individual_budget >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (leader_id) REFERENCES members(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
      );

      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        name TEXT NOT NULL,
        invite_code_hash TEXT NOT NULL,
        session_active INTEGER NOT NULL DEFAULT 0 CHECK(session_active IN (0, 1)),
        joined_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_members_group_name ON members(group_id, name COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS votes (
        group_id TEXT NOT NULL,
        round INTEGER NOT NULL,
        voter_id TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (group_id, round, voter_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (voter_id) REFERENCES members(id) ON DELETE CASCADE,
        FOREIGN KEY (candidate_id) REFERENCES members(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK(amount > 0),
        paid_by_member_id TEXT NOT NULL,
        created_by_member_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
        source TEXT NOT NULL CHECK(source IN ('MANUAL', 'VOICE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (paid_by_member_id) REFERENCES members(id),
        FOREIGN KEY (created_by_member_id) REFERENCES members(id)
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS expense_splits (
        expense_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        share_amount INTEGER NOT NULL CHECK(share_amount >= 0),
        PRIMARY KEY (expense_id, member_id),
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id)
      );

      CREATE TABLE IF NOT EXISTS voice_logs (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        transcript TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACCEPTED')),
        expense_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id),
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_voice_logs_group ON voice_logs(group_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS voice_drafts (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        transcript TEXT NOT NULL,
        title TEXT,
        category TEXT,
        amount INTEGER CHECK(amount IS NULL OR amount > 0),
        paid_by_member_id TEXT,
        missing_fields TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL CHECK(status IN ('PENDING_REVIEW', 'NEEDS_DETAILS', 'ACCEPTED', 'DENIED')),
        expense_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id),
        FOREIGN KEY (paid_by_member_id) REFERENCES members(id),
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_voice_drafts_group ON voice_drafts(group_id, created_at DESC);
    `);

    const memberColumns = this.raw.pragma('table_info(members)') as Array<{ name: string }>;
    if (!memberColumns.some((column) => column.name === 'invite_code_hash')) {
      this.raw.exec('ALTER TABLE members ADD COLUMN invite_code_hash TEXT');
    }
    this.raw.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_members_group_invite_code ON members(group_id, invite_code_hash)');

    const voiceDraftColumns = this.raw.pragma('table_info(voice_drafts)') as Array<{ name: string; notnull: 0 | 1 }>;
    if (voiceDraftColumns.some((column) => column.name === 'amount' && column.notnull === 1)) {
      this.raw.pragma('foreign_keys = OFF');
      this.raw.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE voice_drafts_v2 (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          member_id TEXT NOT NULL,
          transcript TEXT NOT NULL,
          title TEXT,
          category TEXT,
          amount INTEGER CHECK(amount IS NULL OR amount > 0),
          paid_by_member_id TEXT,
          missing_fields TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL CHECK(status IN ('PENDING_REVIEW', 'NEEDS_DETAILS', 'ACCEPTED', 'DENIED')),
          expense_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (member_id) REFERENCES members(id),
          FOREIGN KEY (paid_by_member_id) REFERENCES members(id),
          FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL
        );
        INSERT INTO voice_drafts_v2 (
          id, group_id, member_id, transcript, title, category, amount,
          paid_by_member_id, missing_fields, status, expense_id, created_at, updated_at
        )
        SELECT id, group_id, member_id, transcript, title, category, amount,
          member_id, '[]', status, expense_id, created_at, updated_at
        FROM voice_drafts;
        DROP TABLE voice_drafts;
        ALTER TABLE voice_drafts_v2 RENAME TO voice_drafts;
        CREATE INDEX idx_voice_drafts_group ON voice_drafts(group_id, created_at DESC);
        COMMIT;
      `);
      this.raw.pragma('foreign_keys = ON');
    }
  }
}
