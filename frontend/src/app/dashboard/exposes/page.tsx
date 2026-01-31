'use client';

import { useState } from 'react';
import { FileText, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { getExposeTemplates, deleteExposeTemplate, createExposeTemplate, ExposeTemplate, API_ENDPOINTS } from '@/lib/api';
import { useGlobalState } from '@/context/GlobalStateContext';
import useSWR from 'swr';

export default function ExposesPage() {
  const { openDrawer, updateExposeEditor } = useGlobalState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch templates from API
  const { data: templates = [], mutate, isValidating } = useSWR<ExposeTemplate[]>(
    API_ENDPOINTS.EXPOSE_TEMPLATES,
    getExposeTemplates,
    { revalidateOnFocus: true }
  );

  const selectedTemplate = templates.find(t => t.id === selectedId);

  const handleCreateTemplate = async () => {
    try {
      const newTemplate = await createExposeTemplate({
        name: 'Neue Vorlage',
        blocks: [],
        theme: 'default',
        isDefault: false,
      });
      mutate();
      setSelectedId(newTemplate.id);
      // Open editor immediately
      handleEditTemplate(newTemplate.id);
    } catch (error) {
      alert('Fehler beim Erstellen: ' + error);
    }
  };

  const handleEditTemplate = (templateId: string) => {
    updateExposeEditor({
      exposeId: undefined,
      propertyId: undefined,
      templateId: templateId,
      isTemplate: true,
    });
    openDrawer('EXPOSE_EDITOR');
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Möchtest du diese Vorlage wirklich löschen?')) return;
    try {
      await deleteExposeTemplate(id);
      mutate();
      if (selectedId === id) setSelectedId(null);
    } catch (error) {
      alert('Fehler beim Löschen: ' + error);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Gerade eben';
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE');
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="pt-8 px-8 pb-4">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Exposés & Vorlagen</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-96 flex flex-col bg-gray-50/30">
          {/* Search */}
          <div className="p-4 bg-white flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-md text-sm transition-all"
              />
            </div>
            <button 
              onClick={handleCreateTemplate}
              className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition-colors"
              title="Neue Vorlage"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                {templates.length === 0 ? 'Keine Vorlagen vorhanden.' : 'Keine Treffer.'}
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full text-left p-4 transition-colors flex flex-col gap-1 ${
                    selectedId === template.id 
                      ? 'bg-gray-100/80 rounded-r-lg' 
                      : 'bg-transparent hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-sm font-semibold truncate text-gray-900">
                      {template.name}
                    </span>
                    {template.isDefault && (
                      <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{(template.blocks || []).length} Blöcke • {template.theme}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{formatDate(template.updatedAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white overflow-y-auto">
          {selectedTemplate ? (
            <>
              {/* Detail Header */}
              <div className="px-8 py-6 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {selectedTemplate.name}
                  </h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium mr-3 ${
                      selectedTemplate.isDefault ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedTemplate.isDefault ? 'Standard' : 'Vorlage'}
                    </span>
                    <span className="text-xs">Zuletzt bearbeitet: {formatDate(selectedTemplate.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditTemplate(selectedId!)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTemplate(selectedId!)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" 
                    title="Löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 p-8 pt-0">
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">Theme</div>
                    <div className="font-medium text-gray-900 capitalize">{selectedTemplate.theme}</div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Blöcke ({(selectedTemplate.blocks || []).length})</div>
                  {(selectedTemplate.blocks || []).length === 0 ? (
                    <p className="text-sm text-gray-400">Keine Blöcke definiert. Klicke auf Bearbeiten um Blöcke hinzuzufügen.</p>
                  ) : (
                    <div className="space-y-2">
                      {(selectedTemplate.blocks || []).map((block: any, index: number) => (
                        <div key={block.id || index} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{block.type}</span>
                          {block.title && <span className="text-sm text-gray-600 truncate">{block.title}</span>}
                          {block.content && <span className="text-sm text-gray-600 truncate">{block.content.substring(0, 50)}...</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-full">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">Wähle eine Vorlage aus</p>
              <p className="text-sm">oder erstelle eine neue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

