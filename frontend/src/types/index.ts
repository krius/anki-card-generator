// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Anki卡片类型
export interface AnkiCard {
  id: string;
  front: string;
  back: string;
  tags?: string[];
  deckName?: string;
  cardType?: 'basic' | 'cloze' | 'basic-reversed' | 'input';
  qualityCheck?: QualityCheckResult;
  improvementSummary?: string;
}

// 质检结果
export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  enhancedCard?: AnkiCard;
}

// 卡片生成请求
export interface CardGenerationRequest {
  question: string;
  imageUrl?: string;
  cardType?: AnkiCard['cardType'];
  tags?: string[];
  deckName?: string;
  llmProvider?: 'openai' | 'claude';
}

// 文件上传响应
export interface FileUploadResponse {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

// 用户设置
export interface UserSettings {
  defaultDeckName: string;
  defaultCardType: AnkiCard['cardType'];
  defaultTags: string[];
  llmProvider: 'openai' | 'claude';
  autoExport: boolean;
  qualityThreshold: number;
}

// 应用状态
export interface AppState {
  cards: AnkiCard[];
  selectedCards: string[];
  isLoading: boolean;
  error: string | null;
  settings: UserSettings;
  uploadProgress: number;
  generationProgress: {
    current: number;
    total: number;
  } | null;
}