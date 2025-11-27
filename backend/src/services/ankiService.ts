import { AnkiCard, ExportRequest } from '../types';
import JSZip from 'jszip';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

export class AnkiService {
  private db: Database | null = null;
  private readonly collectionSchema = `
    -- Notes table (stores the actual card content)
    CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      guid TEXT UNIQUE NOT NULL,
      mid INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      tags TEXT,
      flds TEXT NOT NULL,
      sfld TEXT NOT NULL,
      csum INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT
    );

    -- Cards table (stores individual cards)
    CREATE TABLE cards (
      id INTEGER PRIMARY KEY,
      nid INTEGER NOT NULL,
      did INTEGER NOT NULL,
      ord INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      type INTEGER NOT NULL,
      queue INTEGER NOT NULL,
      due INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      left INTEGER NOT NULL,
      flags INTEGER NOT NULL
    );

    -- Note models (card templates)
    CREATE TABLE models (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      req TEXT,
      tmpls TEXT,
      flds TEXT,
      sortf INTEGER,
      css TEXT,
      did INTEGER
    );

    -- Decks table
    CREATE TABLE decks (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      desc TEXT,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      conf INTEGER,
      limit INTEGER,
      revlog INTEGER,
      today INTEGER,
      collapsed INTEGER,
      browserCollapsed INTEGER
    );

    -- Collection configuration
    CREATE TABLE col (
      id INTEGER PRIMARY KEY,
      crt INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      scm INTEGER NOT NULL,
      ver INTEGER NOT NULL,
      dty INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ls INTEGER NOT NULL,
      conf TEXT NOT NULL,
      models TEXT NOT NULL,
      decks TEXT NOT NULL,
      dconf TEXT NOT NULL,
      tags TEXT NOT NULL
    );

    -- Media table
    CREATE TABLE media (
      id INTEGER PRIMARY KEY,
      fname TEXT NOT NULL,
      data BLOB,
      csum INTEGER
    );
  `;

  /**
   * 初始化Anki数据库
   */
  private async initializeDatabase(): Promise<void> {
    if (this.db) return;

    // 创建临时数据库文件
    const dbPath = path.join(process.cwd(), 'data', 'temp_collection.anki2');
    await fs.mkdir(path.dirname(dbPath), { recursive: true });

    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // 创建必要的表结构
    const tables = this.collectionSchema.split(';').filter(sql => sql.trim().length > 0);
    for (const table of tables) {
      await this.db!.exec(table);
    }

    // 初始化默认配置
    await this.initializeCollection();
  }

  /**
   * 初始化集合配置
   */
  private async initializeCollection(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    // 基础模型配置（Basic卡片类型）
    const basicModel = {
      id: 1559399040638,
      name: 'Basic',
      req: [[0, 'all', [0]]],
      tmpls: [{
        name: 'Card 1',
        qfmt: '{{Front}}',
        afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
        did: 1,
        bafmt: '',
        bqfmt: ''
      }],
      flds: [
        { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20 },
        { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20 }
      ],
      css: `.card {
  font-family: arial;
  font-size: 20px;
  text-align: center;
  color: black;
  background-color: white;
}`,
      sortf: 0,
      did: 1
    };

    // 默认牌组
    const defaultDeck = {
      id: 1,
      name: 'Default',
      desc: '',
      mod: now,
      usn: -1,
      conf: 1,
      limit: 100,
      revlog: 21,
      today: [now, 0],
      collapsed: false,
      browserCollapsed: false
    };

    // 集合配置
    const collection = {
      id: 1,
      crt: now,
      mod: now,
      scm: now,
      ver: 11,
      dty: 0,
      usn: -1,
      ls: now,
      conf: JSON.stringify({
        activeDecks: [1],
        addMode: 1,
        collapseTime: 1200,
        creationOffset: null,
        curDeck: 1,
        curModel: 1559399040638,
        dupLimit: 1,
        'dueCounts': true,
        'estTimes': true,
        'futureDue': 1,
        'hardFactor': 1.2,
        'newSpread': 0,
        'schedVersion': 2,
        'timeLim': 0,
        'addToCur': true,
        'maxBackups': 10,
        'maxShownBackups': 5,
        'setDueOnBury': false,
        'dayLearnFirst': false,
        'suspendedMaxShown': false,
        'suspendLeech': false,
        'leechFails': 8,
        'leechAction': 0,
        'offset': 0,
        'utcOffset': 0,
        'curModel': 1559399040638,
        'newPerDay': 20,
        'revPerDay': 100,
        'maxTaken': 60,
        'easeBonus': 1.3,
        'startingEase': 2.5,
        'easyBonus': 1.3,
        'intervalModifier': 1.0,
        'hardInterval': 1.2,
        'autoNext': true,
        'timeoutSecs': 0,
        'counts': [0, 0, 0],
        'reviewEase': 2.5,
        'minSpace': 1,
        'lrnFactor': 1.0,
        'lrnGrad': 0.1,
        'lrnRet': 0.15,
        'lrnMax': 20,
        'gradIvl': 1.0,
        'gradBase': 2.5,
        'eases': [2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.0],
        'maxIvl': 36500,
        'initialFactor': 2.5,
        'servToday': [now, 0],
        'audioVids': [0, 0],
        'deckHistory': {},
        'nightMode': false,
        'deckSortNum': false,
        'newBury': true,
        'bNew': 1,
        'bOld': 1,
        'bLearn': 1,
        'bRev': 1,
        'bETA': 1,
        'bDueCount': true,
        'bFont': true,
        'bOverflow': true,
        'bSearchMode': true,
        'schedVer': 2,
        'sortBackwards': false,
        'sortType': 'noteFld'
      }),
      models: JSON.stringify({ [basicModel.id]: basicModel }),
      decks: JSON.stringify({ [defaultDeck.id]: defaultDeck }),
      dconf: JSON.stringify({ 1: {
        id: 1,
        name: 'Default',
        maxTaken: 60,
        autoplay: true,
        timer: 0,
        replayq: true,
        'mod': now,
        'usn': -1,
        'new': {
          'perDay': 20,
          'delays': [1, 10],
          'ints': [1, 4, 7],
          'separate': true,
          'order': 1,
          'initialFactor': 2500
        },
        'lapse': {
          'delays': [1, 10],
          'mult': 0,
          'minInt': 1,
          'leechFails': 8,
          'leechAction': 0
        },
        'rev': {
          'perDay': 100,
          'ease4': 1.3,
          'fuzz': 0.05,
          'minSpace': 1,
          'ivlFct': 1.0,
          'maxIvl': 36500,
          'hardFactor': 1.2
        }
      }}),
      tags: '{}'
    };

    // 插入初始数据
    await this.db!.run('INSERT INTO col VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      collection.id, collection.crt, collection.mod, collection.scm, collection.ver,
      collection.dty, collection.usn, collection.ls, collection.conf,
      collection.models, collection.decks, collection.dconf, collection.tags
    ]);

    await this.db!.run('INSERT INTO decks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      defaultDeck.id, defaultDeck.name, defaultDeck.desc, defaultDeck.mod,
      defaultDeck.usn, defaultDeck.conf, defaultDeck.limit, defaultDeck.revlog,
      JSON.stringify(defaultDeck.today), defaultDeck.collapsed, defaultDeck.browserCollapsed
    ]);
  }

  /**
   * 生成Anki卡片
   */
  private async createNote(card: AnkiCard): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const guid = this.generateGuid();

    // 格式化字段（Front和Back用\x1f分隔）
    const fields = [card.front, card.back].join('\x1f');

    // 计算校验和
    const csum = this.fieldChecksum(fields);

    // 插入记录
    const result = await this.db!.run(
      `INSERT INTO notes (guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guid,
        1559399040638, // Basic model ID
        now,
        -1, // usn
        (card.tags || []).join(' '),
        fields,
        card.front, // 用于排序的字段
        csum,
        0,
        ''
      ]
    );

    return result.lastID || 0;
  }

  /**
   * 为记录创建卡片
   */
  private async createCard(noteId: number, deckId: number = 1): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

    const result = await this.db!.run(
      `INSERT INTO cards (nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, flags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noteId,
        deckId,
        0, // ord (模板序号)
        now,
        -1, // usn
        0, // type (new card)
        0, // queue (new card)
        now + 1, // due (tomorrow for new cards)
        1, // ivl (interval)
        2500, // factor (ease factor)
        0, // reps
        0, // lapses
        0, // left
        0 // flags
      ]
    );

    return result.lastID || 0;
  }

  /**
   * 生成GUID
   */
  private generateGuid(): string {
    // 生成Anki风格的GUID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return timestamp + random;
  }

  /**
   * 计算字段校验和
   */
  private fieldChecksum(fields: string): number {
    let sum = 0;
    for (let i = 0; i < fields.length; i++) {
      sum = ((sum << 1) & 0xfffffffe) | ((sum >>> 23) & 1);
      sum += fields.charCodeAt(i);
      sum &= 0xffffffff;
    }
    return sum;
  }

  /**
   * 导出Anki卡片包
   */
  async exportAnkiPackage(request: ExportRequest): Promise<Buffer> {
    try {
      // 初始化数据库
      await this.initializeDatabase();

      // 确保exports目录存在
      const exportsDir = path.join(process.cwd(), 'exports');
      await fs.mkdir(exportsDir, { recursive: true });

      // 创建或获取牌组ID
      const deckId = await this.ensureDeckExists(request.deckName || 'Default');

      // 批量创建卡片
      const noteIds: number[] = [];
      for (const card of request.cards) {
        const noteId = await this.createNote(card);
        await this.createCard(noteId, deckId);
        noteIds.push(noteId);
      }

      // 创建APKG文件
      const apkgBuffer = await this.createApkgFile();

      return apkgBuffer;
    } catch (error) {
      console.error('Error exporting Anki package:', error);
      throw error;
    } finally {
      // 清理数据库连接
      if (this.db) {
        await this.db.close();
        this.db = null;
      }

      // 删除临时数据库文件
      const dbPath = path.join(process.cwd(), 'data', 'temp_collection.anki2');
      try {
        await fs.unlink(dbPath);
      } catch (error) {
        // 忽略删除错误
      }
    }
  }

  /**
   * 确保牌组存在，不存在则创建
   */
  private async ensureDeckExists(deckName: string): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

    // 检查牌组是否已存在
    const existingDeck = await this.db!.get('SELECT id FROM decks WHERE name = ?', [deckName]);

    if (existingDeck) {
      return existingDeck.id;
    }

    // 创建新牌组
    const deckId = Math.floor(Math.random() * 1000000000) + 1000000000;
    await this.db!.run(
      'INSERT INTO decks (id, name, desc, mod, usn, conf, limit, revlog, today, collapsed, browserCollapsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        deckId,
        deckName,
        '',
        now,
        -1,
        1,
        100,
        21,
        JSON.stringify([now, 0]),
        false,
        false
      ]
    );

    return deckId;
  }

  /**
   * 创建APKG文件
   */
  private async createApkgFile(): Promise<Buffer> {
    const zip = new JSZip();

    // 获取数据库文件路径
    const dbPath = path.join(process.cwd(), 'data', 'temp_collection.anki2');
    const dbBuffer = await fs.readFile(dbPath);

    // 添加数据库到zip
    zip.file('collection.anki2', dbBuffer);

    // 添加媒体文件映射（空的）
    zip.file('media', '{}');

    // 生成zip文件
    return await zip.generateAsync({ type: 'nodebuffer' });
  }
}