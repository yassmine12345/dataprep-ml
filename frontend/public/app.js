// Main App component
const e = React.createElement;
const { useState, useEffect, useCallback, useMemo } = React;

const App = () => {
  const [activePage, setActivePage] = useState('upload');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataset, setDataset] = useState(null);
  const [target, setTarget] = useState('');
  const [task, setTask] = useState('');
  const [eda, setEda] = useState(null);
  const [quality, setQuality] = useState(null);
  const [explorerData, setExplorerData] = useState(null);
  const [advisor, setAdvisor] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [history, setHistory] = useState([]);
  const [acceptedIssues, setAcceptedIssues] = useState({});
  const [selectedOperations, setSelectedOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Navigation handlers
  const navigate = useCallback((page) => {
    setActivePage(page);
    setSidebarOpen(false);
  }, []);

  // Upload handler
  const handleUpload = async (file) => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await window.uploadFile(file);
      setDataset(res);
      setTarget('');
      setTask('');
      setEda(null);
      setQuality(null);
      setExplorerData(null);
      setAdvisor(null);
      setComparison(null);
      setHistory([]);
      setAcceptedIssues({});
      setSelectedOperations([]);
      navigate('dashboard');
      setNotice('Uploaded: ' + res.filename);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Save config (target & task)
  const saveConfig = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      await window.api('/dataset/' + dataset.dataset_id + '/target', {
        method: 'POST',
        body: JSON.stringify({ target: target || null }),
      });
      if (task) {
        await window.api('/dataset/' + dataset.dataset_id + '/task', {
          method: 'POST',
          body: JSON.stringify({ task }),
        });
      }
      setDataset(d => ({ ...d, target: target || null, task: task || null }));
      navigate('dashboard');
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Load EDA
  const loadEda = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      const data = await window.api('/dataset/' + dataset.dataset_id + '/eda');
      setEda(data);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Load Data Quality
  const loadQuality = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      const data = await window.getDataQuality(dataset.dataset_id);
      setQuality(data);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Load Explorer
  const loadExplorer = async (params = {}) => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      const data = await window.getExplorerData(dataset.dataset_id, params);
      setExplorerData(data);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Load Advisor
  const loadAdvisor = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      const data = await window.getDataAdvisor(dataset.dataset_id);
      setAdvisor(data);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Accept/Reject/Custom issues
  const acceptIssue = (id, issue) => {
    if (issue.recommendation === 'none') return;
    setAcceptedIssues(prev => ({ ...prev, [id]: { type: issue.recommendation, feature: issue.feature === '__rows__' ? null : issue.feature } }));
  };

  const rejectIssue = (id) => {
    setAcceptedIssues(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const customIssue = (id, method, issue) => {
    if (!method) return;
    setAcceptedIssues(prev => ({ ...prev, [id]: { type: method, feature: issue.feature === '__rows__' ? null : issue.feature } }));
  };

  // Apply operations
  const applyOperations = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      const ops = Object.values(acceptedIssues);
      await window.api('/dataset/' + dataset.dataset_id + '/operations', {
        method: 'POST',
        body: JSON.stringify({ operations: ops }),
      });
      const result = await window.api('/dataset/' + dataset.dataset_id + '/apply', { method: 'POST' });
      const comp = await window.api('/dataset/' + dataset.dataset_id + '/comparison');
      const hist = await window.getHistory(dataset.dataset_id);
      setComparison(comp);
      setHistory(hist.history || []);
      setSelectedOperations([]);
      setAcceptedIssues({});
      setNotice('Applied ' + ops.length + ' operation(s).');
      navigate('comparison');
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Reset dataset
  const doReset = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      await window.api('/dataset/' + dataset.dataset_id + '/reset', { method: 'POST' });
      setComparison(null);
      setAcceptedIssues({});
      setQuality(null);
      setEda(null);
      setSelectedOperations([]);
      setNotice('Reset to original.');
      navigate('dashboard');
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Undo operation
  const doUndo = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      const result = await window.undoOperation(dataset.dataset_id);
      const hist = await window.getHistory(dataset.dataset_id);
      setHistory(hist.history || []);
      setNotice('Undid last operation.');
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Delete dataset
  const doDelete = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      await window.api('/dataset/' + dataset.dataset_id, { method: 'DELETE' });
      resetUI('Dataset deleted.');
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Handle class balancing
  const handleBalance = async (body) => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      await window.balanceClasses(dataset.dataset_id, body);
      const comp = await window.api('/dataset/' + dataset.dataset_id + '/comparison');
      const hist = await window.getHistory(dataset.dataset_id);
      setComparison(comp);
      setHistory(hist.history || []);
      setNotice('Class balancing applied.');
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Export data
  const handleExport = async (format, datasetType, options = {}) => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      const blob = await window.exportDataset(dataset.dataset_id, {
        format,
        dataset: datasetType,
        ...options,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.filename.rsplit('.', 1)[0]}_${datasetType}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('Export completed.');
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Generate report
  const handleGenerateReport = async () => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      const report = await window.generateReport(dataset.dataset_id);
      return report;
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Advisor action
  const handleAdvisorAction = async (action, columns, details) => {
    if (!dataset) return;
    setError('');
    setLoading(true);
    try {
      // Map advisor actions to operations
      const actionMap = {
        'impute_or_drop': columns.map(c => ({ type: 'median_imputation', feature: c, params: {} })),
        'drop_column': columns.map(c => ({ type: 'drop_column', feature: c, params: {} })),
        'drop_columns': columns.map(c => ({ type: 'drop_column', feature: c, params: {} })),
        'balance_classes': columns.map(c => ({ type: 'smote', feature: c, params: {} })),
        'scale_features': columns.map(c => ({ type: 'standardization', feature: c, params: {} })),
        'encode_categorical': columns.map(c => ({ type: 'one_hot_encoding', feature: c, params: {} })),
        'handle_outliers': columns.map(c => ({ type: 'clip_iqr', feature: c, params: {} })),
        'extract_date_features': columns.map(c => ({ type: 'extract_date_features', feature: c, params: {} })),
      };
      
      const ops = actionMap[action] || [];
      if (ops.length > 0) {
        await window.api('/dataset/' + dataset.dataset_id + '/operations', {
          method: 'POST',
          body: JSON.stringify({ operations: ops }),
        });
        const result = await window.api('/dataset/' + dataset.dataset_id + '/apply', { method: 'POST' });
        const comp = await window.api('/dataset/' + dataset.dataset_id + '/comparison');
        const hist = await window.getHistory(dataset.dataset_id);
        setComparison(comp);
        setHistory(hist.history || []);
        setNotice('Advisor recommendation applied.');
      }
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Load data when page changes
  useEffect(() => {
    if (dataset) {
      switch (activePage) {
        case 'dashboard':
          if (!eda) loadEda();
          if (!quality) loadQuality();
          break;
        case 'explorer':
          if (!explorerData) loadExplorer();
          break;
        case 'quality':
          if (!quality) loadQuality();
          break;
        case 'advisor':
          if (!advisor) loadAdvisor();
          break;
        case 'comparison':
          if (!comparison) {
            window.api('/dataset/' + dataset.dataset_id + '/comparison').then(setComparison);
          }
          if (!history.length) {
            window.getHistory(dataset.dataset_id).then(h => setHistory(h.history || []));
          }
          break;
        case 'history':
          if (!history.length) {
            window.getHistory(dataset.dataset_id).then(h => setHistory(h.history || []));
          }
          break;
      }
    }
  }, [activePage, dataset]);

  const resetUI = (msg) => {
    setDataset(null);
    setTarget('');
    setTask('');
    setEda(null);
    setQuality(null);
    setExplorerData(null);
    setAdvisor(null);
    setComparison(null);
    setHistory([]);
    setAcceptedIssues({});
    setSelectedOperations([]);
    setActivePage('upload');
    setError('');
    if (msg) setNotice(msg);
  };

  // Auto-load EDA when on dashboard
  useEffect(() => {
    if (activePage === 'dashboard' && dataset && !eda) {
      loadEda();
    }
  }, [activePage, dataset, eda]);

  // Render current page
  const renderPage = () => {
    switch (activePage) {
      case 'upload':
        return e(Upload, { onUpload: handleUpload, onNavigate: navigate, loading, dataset });
      case 'dashboard':
        return e(Dashboard, { 
          dataset, 
          eda, 
          quality, 
          recentOperations: history?.slice(0, 5) || [],
          onNavigate: navigate,
          loading,
          target,
          task,
          onSaveConfig: saveConfig,
        });
      case 'explorer':
        return e(DatasetExplorer, { 
          dataset, 
          explorerData, 
          onExplore: loadExplorer,
          onExport: handleExport,
          loading,
        });
      case 'quality':
        return e(DataQualityCenter, { 
          quality, 
          onAcceptIssue: acceptIssue,
          onRejectIssue: rejectIssue,
          onCustomIssue: customIssue,
          acceptedIssues,
          loading,
        });
      case 'preprocessing':
        return e(PreprocessingStudio, { 
          dataset, 
          quality, 
          acceptedIssues, 
          onApplyOperations: applyOperations,
          onPreviewOperation: async () => {},
          operations: selectedOperations,
          loading,
        });
      case 'balancing':
        return e(ClassBalancing, { 
          dataset, 
          target, 
          task,
          classDistribution: eda?.categorical_distributions?.[target]?.top_values?.reduce((acc, v) => ({ ...acc, [v.value]: v.count }), {}) || {},
          onBalance: handleBalance,
          loading,
          onNavigate: navigate,
        });
      case 'comparison':
        return e(Comparison, { 
          comparison, 
          dataset,
          onExport: handleExport,
        });
      case 'history':
        return e(History, { 
          history, 
          dataset,
          onUndo: doUndo,
          onReset: doReset,
          loading,
        });
      case 'advisor':
        return e(DataAdvisor, { 
          advisor, 
          dataset,
          onAction: handleAdvisorAction,
          loading,
        });
      case 'export':
        return e(ExportReports, { 
          dataset, 
          report: comparison,
          onExport: handleExport,
          onGenerateReport: handleGenerateReport,
          loading,
        });
      default:
        return e(Dashboard, { dataset, eda, quality, onNavigate: navigate, loading });
    }
  };

  return e('div', { className: 'app-root' }, [
    e(SidebarProvider, { key: 'provider' }, [
      e(Sidebar, { 
        key: 'sidebar', 
        activePage, 
        onNavigate: navigate,
      }),
      e('main', { key: 'main', className: 'main-content' }, [
        e(Header, { 
          key: 'header',
          title: activePage.charAt(0).toUpperCase() + activePage.slice(1).replace(/([A-Z])/g, ' $1'),
          breadcrumbs: dataset ? [{ label: dataset.filename, href: '#' }] : [],
        }),
        e('div', { key: 'content', className: 'page-content' }, [
          error && e('div', { className: 'alert alert-danger mb-3', role: 'alert' }, error),
          notice && e('div', { className: 'alert alert-info mb-3', role: 'alert' }, notice),
          loading && e('div', { className: 'alert alert-secondary mb-3', role: 'status' }, 'Working...'),
          renderPage(),
        ]),
      ]),
    ]),
  ]);
};

// Initialize
ReactDOM.createRoot(document.getElementById('root')).render(e(App));

// Expose globally for debugging
window.App = App;