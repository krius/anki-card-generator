import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Sparkles } from 'lucide-react';
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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof CardGenerationRequest, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        onError('请选择图片文件');
        return;
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        onError('图片文件不能超过 10MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (): Promise<string | undefined> => {
    if (!imageFile) return undefined;

    try {
      setIsLoading(true);
      setUploadProgress(0);

      const response = await withRetry(
        () => apiService.uploadImage(imageFile, setUploadProgress)
      );

      if (response.success && response.data) {
        return response.data.url;
      } else {
        throw new Error(response.error || '图片上传失败');
      }
    } catch (error) {
      onError(handleApiError(error));
      return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question.trim()) {
      onError('请输入问题');
      return;
    }

    try {
      setIsLoading(true);

      // 如果有图片，先上传
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        imageUrl = await handleImageUpload();
        if (!imageUrl) {
          return; // 上传失败，错误已在handleImageUpload中处理
        }
      }

      const requestData: CardGenerationRequest = {
        ...formData,
        question: formData.question.trim(),
        imageUrl,
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
        removeImage();
      } else {
        throw new Error(response.error || '卡片生成失败');
      }
    } catch (error) {
      onError(handleApiError(error));
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-primary-600" />
        Generate Anki Card
      </h2>

      {/* 问题输入 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.question}
          onChange={(e) => handleInputChange('question', e.target.value)}
          className="textarea-field"
          placeholder="Enter your learning question..."
          rows={3}
          maxLength={1000}
          disabled={isLoading}
        />
        <div className="mt-1 text-sm text-gray-500 text-right">
          {formData.question.length}/1000
        </div>
      </div>

      {/* 图片上传 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image (Optional)
        </label>
        {imagePreview ? (
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Uploaded"
              className="max-w-full h-64 object-cover rounded-lg border border-gray-300"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </button>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-center py-1 rounded-b-lg">
                Uploading... {uploadProgress}%
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              disabled={isLoading}
            >
              <Upload className="w-5 h-5 inline mr-2" />
              Choose Image
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Supports JPEG, PNG, GIF, WebP formats, max 10MB
            </p>
          </div>
        )}
      </div>

      {/* 设置选项 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Type
          </label>
          <select
            value={formData.cardType}
            onChange={(e) => handleInputChange('cardType', e.target.value)}
            className="input-field"
            disabled={isLoading}
          >
            <option value="basic">Basic Q&A</option>
            <option value="cloze">Fill-in-the-blank</option>
            <option value="basic-reversed">Basic Reversed</option>
            <option value="input">Input</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deck Name
          </label>
          <input
            type="text"
            value={formData.deckName}
            onChange={(e) => handleInputChange('deckName', e.target.value)}
            className="input-field"
            placeholder="Default"
            maxLength={100}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* LLM Provider选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Model
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="openai"
              checked={formData.llmProvider === 'openai'}
              onChange={(e) => handleInputChange('llmProvider', e.target.value)}
              className="mr-2"
              disabled={isLoading}
            />
            <span className="text-sm">OpenAI GPT-4</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="claude"
              checked={formData.llmProvider === 'claude'}
              onChange={(e) => handleInputChange('llmProvider', e.target.value)}
              className="mr-2"
              disabled={isLoading}
            />
            <span className="text-sm">Claude</span>
          </label>
        </div>
      </div>

      {/* 标签 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (Optional)
        </label>
        <input
          type="text"
          onKeyDown={addTag}
          className="input-field"
          placeholder="Enter a tag and press Enter"
          disabled={isLoading}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-primary-900 transition-colors"
                disabled={isLoading}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
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
            removeImage();
          }}
          className="btn-secondary"
          disabled={isLoading}
        >
          Reset
        </button>
        <button
          type="submit"
          className="btn-primary flex items-center gap-2"
          disabled={isLoading || !formData.question.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {imageFile ? 'Uploading...' : 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Card
            </>
          )}
        </button>
      </div>
    </form>
  );
};