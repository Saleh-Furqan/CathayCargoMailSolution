import React, { useState, useEffect } from 'react';
import { Plus, Search, HelpCircle, Save, X, TestTube } from 'lucide-react';
import { formatDisplayValue } from '../utils/displayHelpers';

interface CategoryMapping {
  [category: string]: string[];
}

interface ServicePattern {
  [service: string]: string[];
}

interface ClassificationConfig {
  category_mappings: CategoryMapping;
  service_patterns: ServicePattern;
}

interface TestResult {
  content: string;
  category: string;
  confidence: number;
  matched_keywords: string[];
}

const ClassificationManagement: React.FC = () => {
  const [config, setConfig] = useState<ClassificationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [testContent, setTestContent] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    fetchClassificationConfig();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchClassificationConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/classification-config');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching classification config:', error);
      showNotification('Failed to load classification configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const testClassification = async () => {
    if (!testContent.trim()) {
      showNotification('Please enter content to test', 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/classification-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: testContent })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Error testing classification:', error);
      showNotification('Failed to test classification', 'error');
    }
  };

  const addKeywordToCategory = async (category: string) => {
    if (!newKeyword.trim()) {
      showNotification('Please enter a keyword', 'error');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/classification-categories/${category}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [newKeyword.trim()] })
      });

      if (response.ok) {
        showNotification(`Keyword "${newKeyword}" added to ${category}`, 'success');
        setNewKeyword('');
        setEditingCategory(null);
        fetchClassificationConfig();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to add keyword', 'error');
      }
    } catch (error) {
      console.error('Error adding keyword:', error);
      showNotification('Failed to add keyword', 'error');
    }
  };

  const removeKeywordFromCategory = async (category: string, keyword: string) => {
    if (!window.confirm(`Remove "${keyword}" from ${category}?`)) return;

    try {
      const response = await fetch(`http://localhost:5001/classification-categories/${category}/keywords`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [keyword] })
      });

      if (response.ok) {
        showNotification(`Keyword "${keyword}" removed from ${category}`, 'success');
        fetchClassificationConfig();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to remove keyword', 'error');
      }
    } catch (error) {
      console.error('Error removing keyword:', error);
      showNotification('Failed to remove keyword', 'error');
    }
  };

  const createNewCategory = async () => {
    if (!newCategory.trim()) {
      showNotification('Please enter a category name', 'error');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/classification-categories/${newCategory}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [] })
      });

      if (response.ok) {
        showNotification(`Category "${newCategory}" created`, 'success');
        setNewCategory('');
        fetchClassificationConfig();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to create category', 'error');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      showNotification('Failed to create category', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading classification configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Classification Management</h1>
        <p className="text-gray-600 mb-6">Manage goods categories and postal service classification rules</p>
        
        <div className="card p-4 mb-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 mb-1">About Classification</h3>
              <p className="text-sm text-gray-600">
                Classification rules help automatically categorize goods and identify postal services from shipment descriptions.
                Changes apply to new shipments and retroactive recalculations. Use the test tool to verify your keywords work correctly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Classification Test Tool */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TestTube className="h-5 w-5 text-blue-600" />
          Test Classification
        </h2>
        <p className="text-sm text-gray-600 mb-6">Test how your classification rules work with real content descriptions</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Content Description
            </label>
            <textarea
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              placeholder="Enter goods description to test classification..."
              className="input w-full h-24 resize-none"
            />
            <button
              onClick={testClassification}
              className="btn btn-primary mt-3 inline-flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Test Classification
            </button>
          </div>
          
          {testResult && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Classification Result</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Category:</span> 
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {formatDisplayValue(testResult.category)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Confidence:</span> 
                  <span className="font-semibold">
                    {(testResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                {testResult.matched_keywords.length > 0 && (
                  <div>
                    <span className="font-medium block mb-2">Matched Keywords:</span>
                    <div className="flex flex-wrap gap-1">
                      {testResult.matched_keywords.map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goods Categories */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Goods Categories</h2>
              <p className="text-sm text-gray-600">Manage keywords for automatic goods classification</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="input text-sm flex-1 sm:w-40"
              />
              <button
                onClick={createNewCategory}
                className="btn btn-primary text-sm px-3 py-2 inline-flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {config?.category_mappings && Object.entries(config.category_mappings).map(([category, keywords]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{formatDisplayValue(category)}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {keywords.length} keywords
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {keywords.map((keyword, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      <span>{keyword}</span>
                      <button
                        onClick={() => removeKeywordFromCategory(category, keyword)}
                        className="text-red-500 hover:text-red-700 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {editingCategory === category ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="New keyword"
                      className="input text-sm flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addKeywordToCategory(category);
                        }
                      }}
                    />
                    <button
                      onClick={() => addKeywordToCategory(category)}
                      className="btn btn-primary text-sm px-3 py-1"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(null);
                        setNewKeyword('');
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Keyword
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Postal Service Patterns */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Postal Service Patterns</h2>
          <p className="text-sm text-gray-600 mb-6">View patterns used to identify postal services</p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Read-Only</p>
                <p className="text-sm text-yellow-700">
                  Service patterns are currently managed in the backend code. Contact your administrator to modify these patterns.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {config?.service_patterns && Object.entries(config.service_patterns).map(([service, patterns]) => (
              <div key={service} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{formatDisplayValue(service)}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {patterns.length} patterns
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {patterns.map((pattern, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassificationManagement;