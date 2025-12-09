import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { CardGenerationRequest, AnkiCard, QualityCheckResult } from '../types';
import { apiService, handleApiError, withRetry } from '../services/api';

interface CardFormProps {
  onCardGenerated: (card: AnkiCard & { qualityCheck: QualityCheckResult }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onError: (error: string) => void;
}

export const CardForm: React.FC<CardFormProps> = ({
  onCardGenerated,
  isLoading,
  setIsLoading,
  onError,
}) => {
  const [formData, setFormData] = useState<CardGenerationRequest>({
    question: '',
    cardType: 'basic',
    deckName: 'Default',
    tags: [],
    llmProvider: 'openai',
  });

  const handleInputChange = (field: keyof CardGenerationRequest, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question.trim()) {
      onError('请输入问题');
      return;
    }

    try {
      setIsLoading(true);

      const requestData: CardGenerationRequest = {
        ...formData,
        question: formData.question.trim(),
        tags: formData.tags?.filter(tag => tag.trim()) || [],
        deckName: formData.deckName?.trim() || 'Default',
      };

      const response = await withRetry(() => apiService.generateCard(requestData));

      if (response.success && response.data) {
        onCardGenerated(response.data);
        // 重置表单
        setFormData({
          question: '',
          cardType: 'basic',
          deckName: 'Default',
          tags: [],
          llmProvider: 'openai',
        });
      } else {
        throw new Error(response.error || '卡片生成失败');
      }
    } catch (error) {
      onError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (!formData.tags?.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...(prev.tags || []), newTag],
        }));
      }
      e.currentTarget.value = '';
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">创建智能卡片</h2>
      </div>

      {/* 问题输入 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          输入问题 <span className="text-red-500">*</span>
          <span className="text-xs text-gray-400 font-normal ml-2">({formData.question.length}/1000)</span>
        </label>
        <textarea
          value={formData.question}
          onChange={(e) => handleInputChange('question', e.target.value)}
          className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none hover:border-gray-300 text-gray-800 placeholder-gray-400 text-lg"
          placeholder="输入你想要学习的问题..."
          rows={4}
          maxLength={1000}
          disabled={isLoading}
        />
        <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          清晰的问题有助于AI生成更准确的答案
        </p>
      </div>

      {/* 设置选项 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            卡片类型
          </label>
          <select
            value={formData.cardType}
            onChange={(e) => handleInputChange('cardType', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 bg-white text-gray-800"
            disabled={isLoading}
          >
            <option value="basic">基础问答 (Q&A)</option>
            <option value="cloze">填空题</option>
            <option value="basic-reversed">双向问答</option>
            <option value="input">输入题</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            牌组名称
          </label>
          <input
            type="text"
            value={formData.deckName}
            onChange={(e) => handleInputChange('deckName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
            placeholder="默认牌组"
            maxLength={100}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* AI模型选择 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          选择AI模型
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="relative">
            <input
              type="radio"
              value="openai"
              checked={formData.llmProvider === 'openai'}
              onChange={(e) => handleInputChange('llmProvider', e.target.value)}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-gray-300 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 rounded-full peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-colors">
                  <div className="w-full h-full rounded-full bg-white scale-0 peer-checked:scale-50 transition-transform"></div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">OpenAI</div>
                  <div className="text-xs text-gray-500">GPT-4</div>
                </div>
              </div>
            </div>
          </label>

          <label className="relative">
            <input
              type="radio"
              value="claude"
              checked={formData.llmProvider === 'claude'}
              onChange={(e) => handleInputChange('llmProvider', e.target.value)}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-gray-300 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 rounded-full peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-colors">
                  <div className="w-full h-full rounded-full bg-white scale-0 peer-checked:scale-50 transition-transform"></div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Claude</div>
                  <div className="text-xs text-gray-500">Anthropic</div>
                </div>
              </div>
            </div>
          </label>

          <label className="relative">
            <input
              type="radio"
              value="zhipu"
              checked={formData.llmProvider === 'zhipu'}
              onChange={(e) => handleInputChange('llmProvider', e.target.value)}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-gray-300 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 rounded-full peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-colors">
                  <div className="w-full h-full rounded-full bg-white scale-0 peer-checked:scale-50 transition-transform"></div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">智谱AI</div>
                  <div className="text-xs text-gray-500">GLM-4</div>
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 标签 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          标签 <span className="text-xs text-gray-400 font-normal ml-2">(按回车添加)</span>
        </label>
        <input
          type="text"
          onKeyDown={addTag}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
          placeholder="输入标签后按回车添加"
          disabled={isLoading}
        />
        <div className="flex flex-wrap gap-2">
          {formData.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 group"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="w-4 h-4 hover:bg-blue-200 rounded-full transition-colors flex items-center justify-center"
                disabled={isLoading}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={() => {
            setFormData({
              question: '',
              cardType: 'basic',
              deckName: 'Default',
              tags: [],
              llmProvider: 'openai',
            });
          }}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          重置表单
        </button>
        <button
          type="submit"
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg"
          disabled={isLoading || !formData.question.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              生成卡片
            </>
          )}
        </button>
      </div>
    </form>
  );
};