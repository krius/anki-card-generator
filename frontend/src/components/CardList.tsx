import React, { useState } from 'react';
import {
  Check,
  X,
  Edit3,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { AnkiCard, QualityCheckResult } from '../types';
import { apiService, handleApiError, withRetry } from '../services/api';

interface CardListProps {
  cards: AnkiCard[];
  selectedCards: string[];
  onCardSelect: (cardId: string) => void;
  onCardDelete: (cardId: string) => void;
  onCardUpdate: (cardId: string, card: AnkiCard) => void;
  onExport: (cards: AnkiCard[]) => void;
}

interface EditingCard {
  id: string;
  front: string;
  back: string;
  tags: string[];
}

export const CardList: React.FC<CardListProps> = ({
  cards,
  selectedCards,
  onCardSelect,
  onCardDelete,
  onCardUpdate,
  onExport,
}) => {
  const [editingCard, setEditingCard] = useState<EditingCard | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [improvingCards, setImprovingCards] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState<string>('');

  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const getQualityIcon = (qualityCheck?: QualityCheckResult) => {
    if (!qualityCheck) {
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }

    if (qualityCheck.passed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (qualityCheck.score >= 70) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getQualityColor = (qualityCheck?: QualityCheckResult) => {
    if (!qualityCheck) return 'bg-gray-100';
    if (qualityCheck.passed) return 'bg-green-100 border-green-300';
    if (qualityCheck.score >= 70) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const startEditing = (card: AnkiCard) => {
    setEditingCard({
      id: card.id,
      front: card.front,
      back: card.back,
      tags: [...(card.tags || [])],
    });
  };

  const cancelEditing = () => {
    setEditingCard(null);
    setNewTag('');
  };

  const saveEditing = async () => {
    if (!editingCard) return;

    try {
      const updatedCard: AnkiCard = {
        ...editingCard,
        id: editingCard.id,
        front: editingCard.front.trim(),
        back: editingCard.back.trim(),
        tags: editingCard.tags.filter(tag => tag.trim()),
      };

      // 执行质量检查
      const response = await withRetry(() => apiService.checkQuality(updatedCard));

      if (response.success && response.data) {
        updatedCard.qualityCheck = response.data;
      } else {
        throw new Error(response.error || '质量检查失败');
      }

      onCardUpdate(editingCard.id, updatedCard);
      cancelEditing();
    } catch (error) {
      alert('保存失败: ' + handleApiError(error));
    }
  };

  const improveCard = async (card: AnkiCard) => {
    if (!card.qualityCheck || improvingCards.has(card.id)) return;

    try {
      setImprovingCards(prev => new Set(prev).add(card.id));

          const qualityCheck = card.qualityCheck;
      if (!qualityCheck) {
        throw new Error('质量检查结果不可用');
      }

      const response = await withRetry(() =>
        apiService.improveCard(card, qualityCheck.issues, qualityCheck.suggestions)
      );

      if (response.success && response.data) {
        onCardUpdate(card.id, response.data);
      } else {
        throw new Error(response.error || '卡片改进失败');
      }
    } catch (error) {
      alert('改进失败: ' + handleApiError(error));
    } finally {
      setImprovingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(card.id);
        return newSet;
      });
    }
  };

  const addTagToEditingCard = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (editingCard && !editingCard.tags.includes(newTag.trim())) {
        setEditingCard(prev => prev ? {
          ...prev,
          tags: [...prev.tags, newTag.trim()]
        } : null);
      }
      setNewTag('');
    }
  };

  const removeTagFromEditingCard = (tagToRemove: string) => {
    if (!editingCard) return;
    setEditingCard(prev => prev ? {
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    } : null);
  };

  const handleExportSelected = () => {
    const selectedCardObjects = cards.filter(card => selectedCards.includes(card.id));
    if (selectedCardObjects.length === 0) {
      alert('请先选择要导出的卡片');
      return;
    }
    onExport(selectedCardObjects);
  };

  const handleExportAll = () => {
    if (cards.length === 0) {
      alert('没有可导出的卡片');
      return;
    }
    onExport(cards);
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-lg">
        <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <div className="p-2 bg-gray-200 rounded-full">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        <div className="text-gray-600 text-xl font-medium mb-2">还没有生成任何卡片</div>
        <div className="text-gray-400 text-base">使用上方表单生成你的第一张学习卡片</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 导出按钮 */}
      <div className="flex justify-between items-center bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">我的学习卡片</div>
            <div className="text-sm text-gray-500 mt-1">
              共 <span className="font-semibold text-gray-700">{cards.length}</span> 张，
              已选择 <span className="font-semibold text-blue-600">{selectedCards.length}</span> 张
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportAll}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center gap-2 shadow-lg"
          >
            <Download className="w-5 h-5" />
            导出全部
          </button>
          <button
            onClick={handleExportSelected}
            className={`px-6 py-3 font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center gap-2 ${
              selectedCards.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            disabled={selectedCards.length === 0}
          >
            <Download className="w-5 h-5" />
            导出选中 ({selectedCards.length})
          </button>
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`relative rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${getQualityColor(card.qualityCheck)}`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  {/* 选择框 */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCards.includes(card.id)}
                      onChange={() => onCardSelect(card.id)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500"></div>
                  </label>

                  {/* 质量指示器 */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-full shadow-sm">
                      {getQualityIcon(card.qualityCheck)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {card.qualityCheck ? `质量: ${card.qualityCheck.score}/100` : '未检查'}
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleCardExpansion(card.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={expandedCards.has(card.id) ? '收起' : '展开'}
                  >
                    {expandedCards.has(card.id) ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
                  </button>

                  {!editingCard || editingCard.id !== card.id ? (
                    <>
                      {card.qualityCheck && !card.qualityCheck.passed && (
                        <button
                          onClick={() => improveCard(card)}
                          className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
                          disabled={improvingCards.has(card.id)}
                          title="改进卡片"
                        >
                          {improvingCards.has(card.id) ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
                          ) : (
                            <Edit3 className="w-4 h-4 text-yellow-600" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => startEditing(card)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('确定要删除这张卡片吗？')) {
                            onCardDelete(card.id);
                          }
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={saveEditing}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                        title="保存"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="取消"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 卡片内容 */}
              {editingCard && editingCard.id === card.id ? (
                /* 编辑模式 */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">正面问题</label>
                    <textarea
                      value={editingCard.front}
                      onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
                      rows={3}
                      maxLength={2000}
                    />
                    <div className="text-xs text-gray-500 text-right mt-1">
                      {editingCard.front.length}/2000
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">背面答案</label>
                    <textarea
                      value={editingCard.back}
                      onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
                      rows={4}
                      maxLength={2000}
                    />
                    <div className="text-xs text-gray-500 text-right mt-1">
                      {editingCard.back.length}/2000
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">标签</label>
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={addTagToEditingCard}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入标签后按回车添加"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {editingCard.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 group"
                        >
                          {tag}
                          <button
                            onClick={() => removeTagFromEditingCard(tag)}
                            className="w-4 h-4 hover:bg-blue-200 rounded-full transition-colors flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* 查看模式 */
                <div>
                  <div className="text-lg font-semibold text-gray-900 leading-relaxed mb-3">
                    {card.front}
                  </div>

                  {expandedCards.has(card.id) && (
                    <div className="animate-slide-up">
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-gray-700 leading-relaxed mb-4">
                          {card.back}
                        </div>

                        {/* 质量检查详情 */}
                        {card.qualityCheck && (
                          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              质量分析报告
                            </h4>
                            {!card.qualityCheck.passed && (
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-red-700">需要改进的问题:</div>
                                <ul className="text-sm text-red-600 space-y-1">
                                  {card.qualityCheck.issues.map((issue, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-red-400 mt-1">•</span>
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {card.qualityCheck.suggestions.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-blue-700">改进建议:</div>
                                <ul className="text-sm text-blue-600 space-y-1">
                                  {card.qualityCheck.suggestions.map((suggestion, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-blue-400 mt-1">•</span>
                                      {suggestion}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 标签和元信息 */}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {card.tags?.map((tag) => (
                              <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 space-x-3">
                            {card.deckName && (
                              <span>牌组: <span className="font-medium">{card.deckName}</span></span>
                            )}
                            {card.cardType && (
                              <span>类型: <span className="font-medium">{card.cardType}</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};