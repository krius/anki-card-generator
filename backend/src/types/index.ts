// 卡片相关类型
export interface AnkiCard {
  id: string;
  front: string;
  back: string;
  tags?: string[];
  deckName?: string;
  cardType?: 'basic' | 'cloze' | 'basic-reversed' | 'input';
}

// 卡片生成请求
export interface CardGenerationRequest {
  question: string;
  imageUrl?: string;
  cardType?: AnkiCard['cardType'];
  tags?: string[];
  deckName?: string;
}

// 质检结果
export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  enhancedCard?: AnkiCard;
}

// OCR结果
export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
}

// LLM响应
export interface LLMResponse {
  success: boolean;
  answer?: string;
  error?: string;
  tokensUsed?: number;
  model?: string;
}

// API响应包装器
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 文件上传信息
export interface FileUpload {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  path: string;
}

// 导出请求
export interface ExportRequest {
  cards: AnkiCard[];
  deckName: string;
  includeMedia?: boolean;
}

// 用户设置
export interface UserSettings {
  defaultDeckName: string;
  defaultCardType: AnkiCard['cardType'];
  autoExport: boolean;
  qualityThreshold: number;
  llmProvider: 'openai' | 'claude';
  apiKey: string;
}