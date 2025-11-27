import React, { useState, useEffect } from 'react';
import {
  Book,
  Github,
  AlertCircle,
  CheckCircle,
  Settings,
  Zap,
  Database
} from 'lucide-react';

import { CardForm } from './components/CardForm';
import { CardList } from './components/CardList';
import { AnkiCard, UserSettings } from './types';
import { apiService, handleApiError, withRetry } from './services/api';

function App() {
  const [cards, setCards] = useState<AnkiCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);

  // 默认设置
  const [settings] = useState<UserSettings>({
    defaultDeckName: 'Default',
    defaultCardType: 'basic',
    defaultTags: [],
    llmProvider: 'openai',
    autoExport: false,
    qualityThreshold: 70,
  });

  // 健康检查
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiService.healthCheck();
        if (!response.success) {
          setError('后端服务不可用，请检查服务器状态');
        }
      } catch (err) {
        setError('无法连接到后端服务，请确保服务器正在运行');
      }
    };

    checkHealth();
  }, []);

  const handleCardGenerated = (newCard: AnkiCard & { qualityCheck: any }) => {
    setCards(prev => [...prev, newCard]);
    setError(null);
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleCardDelete = (cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    setSelectedCards(prev => prev.filter(id => id !== cardId));
  };

  const handleCardUpdate = (cardId: string, updatedCard: AnkiCard) => {
    setCards(prev => prev.map(card =>
      card.id === cardId ? updatedCard : card
    ));
  };

  const handleExport = async (cardsToExport: AnkiCard[]) => {
    try {
      setIsLoading(true);
      setError(null);

      const deckName = `Anki_Cards_${new Date().toISOString().split('T')[0]}`;
      const blob = await withRetry(() => apiService.exportAnkiPackage(cardsToExport, deckName));

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deckName}.apkg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 清空已导出的卡片（可选）
      if (settings.autoExport) {
        const exportedIds = cardsToExport.map(card => card.id);
        setCards(prev => prev.filter(card => !exportedIds.includes(card.id)));
        setSelectedCards(prev => prev.filter(id => !exportedIds.includes(id)));
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchExport = async () => {
    if (cards.length === 0) {
      setError('没有可导出的卡片');
      return;
    }

    // 分批处理，每批最多50张卡片
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < cards.length; i += batchSize) {
      batches.push(cards.slice(i, i + batchSize));
    }

    try {
      setIsLoading(true);
      setError(null);

      for (let i = 0; i < batches.length; i++) {
        setGenerationProgress({ current: i + 1, total: batches.length });
        const deckName = `Anki_Cards_Batch_${i + 1}_${new Date().toISOString().split('T')[0]}`;
        const blob = await withRetry(() => apiService.exportAnkiPackage(batches[i], deckName));

        // 下载当前批次的文件
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deckName}.apkg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
      setGenerationProgress(null);
    }
  };

  // 统计信息
  const stats = {
    total: cards.length,
    passed: cards.filter(card => card.qualityCheck?.passed).length,
    needsImprovement: cards.filter(card => card.qualityCheck && !card.qualityCheck.passed && card.qualityCheck.score >= 70).length,
    poor: cards.filter(card => card.qualityCheck && card.qualityCheck.score < 70).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Anki卡片生成器</h1>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/your-repo/anki-card-generator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <button
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="设置"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：表单 */}
          <div className="space-y-6">
            <CardForm
              onCardGenerated={handleCardGenerated}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              onError={setError}
            />

            {/* 统计信息 */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-600" />
                统计信息
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-500">总卡片数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                  <div className="text-sm text-gray-500">质量通过</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.needsImprovement}</div>
                  <div className="text-sm text-gray-500">需改进</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.poor}</div>
                  <div className="text-sm text-gray-500">质量差</div>
                </div>
              </div>

              {/* 批量导出按钮 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleBatchExport}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                  disabled={isLoading || cards.length === 0}
                >
                  <Zap className="w-4 h-4" />
                  {generationProgress
                    ? `导出中... ${generationProgress.current}/${generationProgress.total}`
                    : '批量导出全部卡片'
                  }
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：卡片列表 */}
          <div>
            <CardList
              cards={cards}
              selectedCards={selectedCards}
              onCardSelect={handleCardSelect}
              onCardDelete={handleCardDelete}
              onCardUpdate={handleCardUpdate}
              onExport={handleExport}
            />
          </div>
        </div>
      </main>

      {/* 错误提示 */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-900">错误</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {!error && !isLoading && cards.length > 0 && (
        <div className="fixed bottom-4 right-4 max-w-md bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-900">就绪</div>
              <div className="text-sm text-green-700 mt-1">
                已生成 {cards.length} 张卡片，随时可以导出为Anki格式
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 加载指示器 */}
      {isLoading && (
        <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-gray-700">
              {generationProgress
                ? `处理中... ${generationProgress.current}/${generationProgress.total}`
                : '正在处理...'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;