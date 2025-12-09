import axios, { AxiosResponse } from 'axios';
import { ApiResponse, AnkiCard, CardGenerationRequest, QualityCheckResult, FileUploadResponse, UserSettings } from '../types';

// API基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2分钟超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);

    // 统一错误处理
    if (error.response?.status === 429) {
      error.response.data = {
        success: false,
        error: '请求过于频繁，请稍后再试',
      };
    } else if (error.code === 'ECONNABORTED') {
      error.response = {
        data: {
          success: false,
          error: '请求超时，请检查网络连接',
        },
        status: 408,
      };
    } else if (!error.response?.data) {
      error.response = {
        data: {
          success: false,
          error: '网络连接错误，请检查后端服务是否运行',
        },
        status: error.code || 500,
      };
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  // 健康检查
  async healthCheck(): Promise<ApiResponse> {
    const response = await api.get('/health');
    return response.data;
  },

  // 获取API信息
  async getApiInfo(): Promise<ApiResponse> {
    const response = await api.get('/api');
    return response.data;
  },

  // 生成单个卡片
  async generateCard(request: CardGenerationRequest): Promise<ApiResponse<AnkiCard & { qualityCheck: QualityCheckResult }>> {
    const response = await api.post('/api/cards/generate', request);
    return response.data;
  },

  // 批量生成卡片
  async generateCards(questions: string[], settings: Partial<UserSettings>): Promise<ApiResponse<{
    cards: (AnkiCard & { qualityCheck: QualityCheckResult })[];
    errors: { index: number; error: string }[];
  }>> {
    const response = await api.post('/api/cards/generate/batch', { questions, settings });
    return response.data;
  },

  // 质量检查
  async checkQuality(card: AnkiCard): Promise<ApiResponse<QualityCheckResult>> {
    const response = await api.post('/api/cards/quality-check', { card });
    return response.data;
  },

  // 改进卡片
  async improveCard(card: AnkiCard, issues: string[], suggestions: string[]): Promise<ApiResponse<AnkiCard & {
    qualityCheck: QualityCheckResult;
    improvementSummary: string;
  }>> {
    const response = await api.post('/api/cards/improve', { card, issues, suggestions });
    return response.data;
  },

  // 导出Anki包
  async exportAnkiPackage(cards: AnkiCard[], deckName: string): Promise<Blob> {
    const response = await api.post('/api/cards/export', { cards, deckName }, {
      responseType: 'blob',
    });
    return response.data;
  },

  // 上传图片
  async uploadImage(file: File, onUploadProgress?: (progress: number) => void): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/api/cards/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });

    return response.data;
  },
};

// 错误处理工具
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  } else if (error.message) {
    return error.message;
  } else {
    return '发生未知错误，请重试';
  }
};

// 重试机制
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        const currentDelay = delay;
        console.warn(`Operation failed, retrying in ${currentDelay}ms... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        delay *= 2; // 指数退避
      }
    }
  }

  throw lastError;
};