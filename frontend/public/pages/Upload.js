// Upload page
const e = React.createElement;
const { useState, useRef, useCallback } = React;

const Upload = ({ onUpload, onNavigate, loading, dataset }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadProgress(0);
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      await onUpload(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['csv', 'tsv', 'txt'].includes(ext)) return 'fileText';
    if (['xlsx', 'xls'].includes(ext)) return 'spreadsheet';
    if (['json'].includes(ext)) return 'code';
    return 'file';
  };

  if (dataset) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon bg-green-100 text-green-600', key: 'icon' }, e(Icon, { name: 'checkCircle', size: 48 })),
      e('h3', { key: 'title', className: 'empty-state-title' }, 'Dataset Already Loaded'),
      e('p', { key: 'desc', className: 'empty-state-description' }, `${dataset.filename} (${dataset.rows.toLocaleString()} rows × ${dataset.columns} columns)`),
      e('div', { key: 'actions', className: 'd-flex gap-2 mt-3' }, [
        e(Button, { variant: 'primary', leftIcon: 'arrowRight', onClick: () => onNavigate('dashboard') }, 'Go to Dashboard'),
        e(Button, { variant: 'secondary', leftIcon: 'upload', onClick: () => onNavigate('upload') }, 'Upload Another'),
      ]),
    ]);
  }

  return e('div', { className: 'max-w-2xl mx-auto' }, [
    e(Card, { 
      key: 'upload',
      header: e('div', { className: 'd-flex justify-content-between align-items-center' }, [
        e('h3', { className: 'card-title' }, 'Upload Dataset'),
        e('span', { className: 'badge badge-info' }, 'Max 50 MB'),
      ]),
    }, [
      e('div', {
        className: ['dropzone', dragActive && 'dragover'].join(' '),
        onDragEnter: handleDrag,
        onDragLeave: handleDrag,
        onDragOver: handleDrag,
        onDrop: handleDrop,
        onClick: () => fileInputRef.current?.click(),
      }, [
        e('input', {
          ref: fileInputRef,
          type: 'file',
          id: 'fileIn',
          accept: '.csv,.tsv,.txt,.xlsx,.xls,.json',
          style: { display: 'none' },
          onChange: handleFileSelect,
        }),
        selectedFile ? e('div', { className: 'd-flex align-items-center justify-content-between p-3 bg-white rounded-lg border' }, [
          e('div', { className: 'd-flex align-items-center gap-3' }, [
            e('div', { className: ['file-icon', `bg-${getFileIcon(selectedFile.name).includes('spreadsheet') ? 'green' : getFileIcon(selectedFile.name).includes('code') ? 'violet' : 'blue'}-100 text-${getFileIcon(selectedFile.name).includes('spreadsheet') ? 'green' : getFileIcon(selectedFile.name).includes('code') ? 'violet' : 'blue'}-600`].join(' '), style: { width: 48, height: 48, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, 
              e(Icon, { name: getFileIcon(selectedFile.name), size: 24 })
            ),
            e('div', null, [
              e('div', { className: 'fw-semibold' }, selectedFile.name),
              e('div', { className: 'text-muted small' }, formatFileSize(selectedFile.size)),
            ]),
          ]),
          e(Button, { variant: 'ghost', size: 'sm', onClick: handleRemoveFile }, e(Icon, { name: 'x', size: 16 })),
        ]) : e('div', { className: 'text-center py-5' }, [
          e(Icon, { name: 'upload', size: 48, className: 'text-muted mb-3' }),
          e('p', { className: 'mb-1 fw-semibold', style: { fontSize: '1.125rem' } }, 'Drop CSV, TSV, XLSX, or JSON here'),
          e('p', { className: 'text-muted small mb-0' }, 'or click to browse (max 50 MB)'),
        ]),
      ]),

      selectedFile && e('div', { className: 'mt-3' }, [
        e('div', { className: 'd-flex align-items-center justify-content-between mb-2' }, [
          e('span', { className: 'text-muted small' }, 'Ready to upload'),
          e('div', { className: 'd-flex gap-2' }, [
            e(Button, { variant: 'secondary', onClick: handleRemoveFile, leftIcon: 'x' }, 'Remove'),
            e(Button, { variant: 'primary', onClick: handleUpload, leftIcon: 'upload', loading: loading || uploadProgress > 0 }, uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Upload Dataset'),
          ]),
        ]),
        uploadProgress > 0 && e('div', { className: 'progress' }, 
          e('div', { className: 'progress-bar', style: { width: `${uploadProgress}%` } })
        ),
      ]),

      e('div', { key: 'formats', className: 'mt-4 p-3 bg-tertiary rounded-lg' }, [
        e('h6', { className: 'mb-2' }, 'Supported Formats'),
        e('div', { className: 'd-flex flex-wrap gap-2' }, [
          ['CSV (.csv)', 'TSV (.tsv)', 'Text (.txt)', 'Excel (.xlsx, .xls)', 'JSON (.json)'].map((fmt, i) => 
            e('span', { key: i, className: 'badge badge-secondary' }, fmt)
          ),
        ]),
      ]),
    ]),

    e(Card, { key: 'help', header: 'Getting Started' }, [
      e('div', { className: 'row g-3' }, [
        e('div', { className: 'col-md-4' }, [
          e('div', { className: 'd-flex gap-3' }, [
            e('div', { className: 'bg-indigo-100 text-indigo-600 p-3 rounded-lg' }, e(Icon, { name: 'upload', size: 24 })),
            e('div', null, [
              e('h6', { className: 'mb-1' }, '1. Upload Data'),
              e('p', { className: 'text-muted small mb-0' }, 'Drag and drop or click to select your dataset file'),
            ]),
          ]),
        ]),
        e('div', { className: 'col-md-4' }, [
          e('div', { className: 'd-flex gap-3' }, [
            e('div', { className: 'bg-violet-100 text-violet-600 p-3 rounded-lg' }, e(Icon, { name: 'quality', size: 24 })),
            e('div', null, [
              e('h6', { className: 'mb-1' }, '2. Analyze Quality'),
              e('p', { className: 'text-muted small mb-0' }, 'Automatic detection of issues with actionable recommendations'),
            ]),
          ]),
        ]),
        e('div', { className: 'col-md-4' }, [
          e('div', { className: 'd-flex gap-3' }, [
            e('div', { className: 'bg-teal-100 text-teal-600 p-3 rounded-lg' }, e(Icon, { name: 'preprocessing', size: 24 })),
            e('div', null, [
              e('h6', { className: 'mb-1' }, '3. Clean & Transform'),
              e('p', { className: 'text-muted small mb-0' }, 'Apply preprocessing operations with full control and preview'),
            ]),
          ]),
        ]),
      ]),
    ]),
  ]);
};

window.Upload = Upload;