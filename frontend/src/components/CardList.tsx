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
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <div className="text-gray-500 text-lg mb-2">还没有生成任何卡片</div>
        <div className="text-gray-400 text-sm">使用上方表单生成你的第一张卡片</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 导出按钮 */}
      <div className="flex justify-between items-center bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-sm text-gray-600">
          已生成 {cards.length} 张卡片，
          已选择 {selectedCards.length} 张
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportAll}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出全部
          </button>
          <button
            onClick={handleExportSelected}
            className="btn-secondary flex items-center gap-2"
            disabled={selectedCards.length === 0}
          >
            <Download className="w-4 h-4" />
            导出选中 ({selectedCards.length})
          </button>
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="space-y-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`card-container ${getQualityColor(card.qualityCheck)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                {/* 选择框 */}
                <input
                  type="checkbox"
                  checked={selectedCards.includes(card.id)}
                  onChange={() => onCardSelect(card.id)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />

                {/* 质量指示器 */}
                <div className="flex items-center gap-2">
                  {getQualityIcon(card.qualityCheck)}
                  <span className="text-sm text-gray-600">
                    {card.qualityCheck ? `质量: ${card.qualityCheck.score}/100` : '未检查'}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCardExpansion(card.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={expandedCards.has(card.id) ? '收起' : '展开'}
                >
                  {expandedCards.has(card.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                {!editingCard || editingCard.id !== card.id ? (
                  <>
                    {card.qualityCheck && !card.qualityCheck.passed && (
                      <button
                        onClick={() => improveCard(card)}
                        className="p-1 hover:bg-yellow-100 rounded transition-colors"
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
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('确定要删除这张卡片吗？')) {
                          onCardDelete(card.id);
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={saveEditing}
                      className="p-1 hover:bg-green-100 rounded transition-colors"
                      title="保存"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
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
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">正面</label>
                  <textarea
                    value={editingCard.front}
                    onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })}
                    className="textarea-field"
                    rows={3}
                    maxLength={2000}
                  />
                  <div className="text-sm text-gray-500 text-right mt-1">
                    {editingCard.front.length}/2000
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">背面</label>
                  <textarea
                    value={editingCard.back}
                    onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })}
                    className="textarea-field"
                    rows={4}
                    maxLength={2000}
                  />
                  <div className="text-sm text-gray-500 text-right mt-1">
                    {editingCard.back.length}/2000
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={addTagToEditingCard}
                    className="input-field"
                    placeholder="输入标签后按回车添加"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingCard.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800"
                      >
                        {tag}
                        <button
                          onClick={() => removeTagFromEditingCard(tag)}
                          className="hover:text-primary-900"
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
                <div className="card-front">{card.front}</div>

                {expandedCards.has(card.id) && (
                  <div className="mt-3 slide-up">
                    <div className="card-back">{card.back}</div>

                    {/* 质量检查详情 */}
                    {card.qualityCheck && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">质量分析</h4>
                        {!card.qualityCheck.passed && (
                          <div className="mb-2">
                            <div className="text-sm font-medium text-red-700 mb-1">问题:</div>
                            <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                              {card.qualityCheck.issues.map((issue, index) => (
                                <li key={index}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {card.qualityCheck.suggestions.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-blue-700 mb-1">建议:</div>
                            <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
                              {card.qualityCheck.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 标签和元信息 */}
                    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {card.tags?.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div>
                        {card.deckName && (
                          <span className="mr-3">牌组: {card.deckName}</span>
                        )}
                        {card.cardType && (
                          <span>类型: {card.cardType}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};