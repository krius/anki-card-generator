import { AnkiCard, ExportRequest } from '../types';
import JSZip from 'jszip';

export class AnkiService {
  /**
   * 生成Anki .apkg文件
   */
  async exportAnkiPackage(request: ExportRequest): Promise<Buffer> {
    const { cards, deckName, includeMedia = false } = request;

    try {
      const zip = new JSZip();

      // 生成基本的collection.json (简化版)
      const collectionData = this.generateCollectionJson();
      zip.file('collection', JSON.stringify(collectionData));

      // 生成deck
      const deckData = this.generateDeckJson(deckName, cards);
      zip.file('collection.anki2', JSON.stringify(deckData));

      // 生成媒体文件映射（如果需要）
      if (includeMedia) {
        const mediaData = this.generateMediaJson(cards);
        zip.file('media', JSON.stringify(mediaData));
      }

      // 生成卡片数据
      const cardData = this.generateCardData(cards);
      zip.file('cards', JSON.stringify(cardData));

      // 生成笔记数据
      const noteData = this.generateNoteData(cards);
      zip.file('notes', JSON.stringify(noteData));

      // 生成模型数据
      const modelData = this.generateModelData();
      zip.file('models', JSON.stringify(modelData));

      return await zip.generateAsync({ type: 'nodebuffer' });
    } catch (error) {
      console.error('Error generating Anki package:', error);
      throw new Error(`Failed to generate Anki package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 生成collection.json数据
   */
  private generateCollectionJson() {
    return {
      "archivedTags": [],
      "collapsedTags": [],
      "deck_config": [
        {
          "id": 1,
          "name": "Default",
          "maxTaken": 60,
          "autoplay": true,
          "timer": 0,
          "newPerDay": 20,
          "revPerDay": 100,
          "separateDays": false,
          "newMix": 0,
          "newPerDayMinimum": 0,
          "interdayLearningMix": 1,
          "reviewOrder": 0,
          "newInsertOrder": 0,
          "learnAheadPercentage": 0.2,
          "relearnDays": 14,
          "hardBonus": 1.2,
          "easyBonus": 1.3,
          "intervalModifier": 1.0,
          "daysBeforeV2": 0,
          "fsrsWeights": null,
          "fsrsOnly": false,
          "delays": [1, 10],
          "hardFactor": 1.2,
          "graduatingInterval": 1,
          "startingEase": 2.5,
          "easyInterval": 4,
          "ease4": 2.5,
          "burySiblings": true,
          "buryRepeats": true,
          "buryReviews": true,
          "buryNew": true,
          "buryInterdayLearning": true,
          "loadBalancedReviews": false,
          "cram": false
        }
      ],
      "deck_configs": [1],
      "decks": [
        {
          "id": 1,
          "name": "Default",
          "md": true,
          "conf": 1,
          "mod": 1559399040638,
          "usn": -1,
          "lrnToday": [0, 0],
          "newToday": [0, 0],
          "revToday": [0, 0],
          "timeToday": [0, 0],
          "left": 1001
        }
      ],
      "tags": [],
      "deckUpdated": -1,
      "crashed": false,
      "dynamicImports": [],
      "lastUnburied": -1,
      "smallBookmark": -1,
      "modelChanged": false,
      "schedVer": 2,
      "creationOffset": null,
      "nextCol": 1
    };
  }

  /**
   * 生成deck数据
   */
  private generateDeckJson(deckName: string, cards: AnkiCard[]) {
    return {
      "cards": cards.map(card => ({
        id: this.generateId(),
        nid: this.generateId(),
        did: 1,
        ord: 0,
        mod: this.getCurrentTimestamp(),
        usn: -1,
        type: 0,
        queue: 0,
        due: 0,
        ivl: 0,
        factor: 0,
        reps: 0,
        lapses: 0,
        left: 0,
        wdue: 0
      })),
      "notes": cards.map(card => ({
        id: this.generateId(),
        guid: this.generateGuid(),
        mid: 1559399040638,
        mod: this.getCurrentTimestamp(),
        usn: -1,
        tags: (card.tags || []).join(' '),
        flds: `${card.front}\x1f${card.back}`,
        sfld: card.front,
        csum: this.getFieldChecksum(card.front),
        flags: 0,
        data: ""
      }))
    };
  }

  /**
   * 生成卡片数据
   */
  private generateCardData(cards: AnkiCard[]) {
    return cards.map((card, index) => ({
      id: this.generateId(),
      nid: this.generateId(),
      did: 1,
      ord: 0,
      mod: this.getCurrentTimestamp(),
      usn: -1,
      type: 0,
      queue: 0,
      due: 0,
      ivl: 0,
      factor: 0,
      reps: 0,
      lapses: 0,
      left: 0,
      wdue: 0
    }));
  }

  /**
   * 生成笔记数据
   */
  private generateNoteData(cards: AnkiCard[]) {
    return cards.map(card => ({
      id: this.generateId(),
      guid: this.generateGuid(),
      mid: 1559399040638,
      mod: this.getCurrentTimestamp(),
      usn: -1,
      tags: (card.tags || []).join(' '),
      flds: `${card.front}\x1f${card.back}`,
      sfld: card.front,
      csum: this.getFieldChecksum(card.front),
      flags: 0,
      data: ""
    }));
  }

  /**
   * 生成模型数据
   */
  private generateModelData() {
    return {
      "1559399040638": {
        "id": 1559399040638,
        "name": "Basic",
        "flds": [
          {
            "name": "Front",
            "ord": 0,
            "sticky": false,
            "rtl": false,
            "font": "Arial",
            "size": 20,
            "description": "",
            "plain": true,
            "collapsed": false,
            "exclude_from_search": false,
            "prevent_deletion": false
          },
          {
            "name": "Back",
            "ord": 1,
            "sticky": false,
            "rtl": false,
            "font": "Arial",
            "size": 20,
            "description": "",
            "plain": true,
            "collapsed": false,
            "exclude_from_search": false,
            "prevent_deletion": false
          }
        ],
        "tmpls": [
          {
            "name": "Card 1",
            "ord": 0,
            "qfmt": "{{Front}}",
            "afmt": "{{FrontSide}}<hr id=answer>{{Back}}",
            "bqfmt": "",
            "bafmt": "",
            "did": null,
            "bfont": "",
            "bsize": 0,
            "tcol": [
              null,
              null,
              null,
              null
            ]
          }
        ],
        "css": ".card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n",
        "latexPre": "",
        "latexPost": "",
        "latexsvg": false,
        "type": 0,
        "sortf": 0,
        "did": null,
        "usn": -1,
        "req": [
          [
            0,
            "any",
            [
              0
            ]
          ]
        ],
        "vers": [],
        "lm": {
          "Review": {
            "active": true,
            "lastOffset": 0,
            "history": []
          },
          "Learn": {
            "active": true,
            "lastOffset": 0,
            "history": []
          },
          "Relearn": {
            "active": true,
            "lastOffset": 0,
            "history": []
          },
          "Cram": {
            "active": true,
            "lastOffset": 0,
            "history": []
          }
        }
      }
    };
  }

  /**
   * 生成媒体文件映射
   */
  private generateMediaJson(cards: AnkiCard[]) {
    return {};
  }

  /**
   * 生成唯一ID
   */
  private generateId(): number {
    return Date.now() * 1000 + Math.floor(Math.random() * 1000);
  }

  /**
   * 生成GUID
   */
  private generateGuid(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * 获取当前时间戳
   */
  private getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 计算字段校验和
   */
  private getFieldChecksum(field: string): number {
    let sum = 0;
    for (let i = 0; i < field.length; i++) {
      sum = ((sum << 1) & 0xfffffffe) | ((sum >>> 31) & 1);
      sum += field.charCodeAt(i);
      sum &= 0xffffffff;
    }
    return sum;
  }
}