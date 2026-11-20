// Export & Reports page
const e = React.createElement;
const { useState, useEffect } = React;

const ExportReports = ({ 
  dataset, 
  report,
  onExport,
  onGenerateReport,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState('export');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportDataset, setExportDataset] = useState('cleaned');
  const [includeIndex, setIncludeIndex] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleExport = async () => {
    await onExport(exportFormat, exportDataset, { includeIndex: setIncludeIndex });
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const report = await onGenerateReport();
      setReportData(report);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!dataset) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon', key: 'icon' }, e(Icon, { name: 'export', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No Dataset Loaded'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Upload a dataset to export data or generate reports'),
    ]);
  }

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'Export & Reports'),
        e('p', { className: 'text-muted' }, `Dataset: ${dataset.filename}`),
      ]),
    ]),

    e('div', { key: 'tabs', className: 'tabs mb-4' }, [
      e('button', { className: ['tab', activeTab === 'export' && 'active'].filter(Boolean).join(' '), onClick: () => setActiveTab('export') }, e(Icon, { name: 'download', size: 16, className: 'me-1' }), 'Export Data'),
      e('button', { className: ['tab', activeTab === 'report' && 'active'].filter(Boolean).join(' '), onClick: () => setActiveTab('report') }, e(Icon, { name: 'fileText', size: 16, className: 'me-1' }), 'Generate Report'),
    ]),

    activeTab === 'export' && e('div', { key: 'export', className: 'tab-content active' }, [
      e('div', { className: 'row g-4' }, [
        e('div', { key: 'export-options', className: 'col-12 col-lg-5' },
          e(Card, { header: 'Export Settings' }, [
            e('div', { className: 'mb-3' }, [
              e('label', { className: 'form-label' }, 'Export Format'),
              e('div', { className: 'd-flex gap-2' }, [
                e('label', { className: ['btn', exportFormat === 'csv' ? 'btn-primary' : 'btn-outline'].join(' '), style: { flex: 1 } },
                  e('input', { type: 'radio', name: 'format', value: 'csv', checked: exportFormat === 'csv', onChange: e => setExportFormat('csv'), className: 'me-2' }),
                  e(Icon, { name: 'fileText', size: 18, className: 'me-2' }), 'CSV'
                ),
                e('label', { className: ['btn', exportFormat === 'excel' ? 'btn-primary' : 'btn-outline'].join(' '), style: { flex: 1 } },
                  e('input', { type: 'radio', name: 'format', value: 'excel', checked: exportFormat === 'excel', onChange: e => setExportFormat('excel'), className: 'me-2' }),
                  e(Icon, { name: 'spreadsheet', size: 18, className: 'me-2' }), 'Excel'
                ),
              ]),
            ]),

            e('div', { className: 'mb-3' }, [
              e('label', { className: 'form-label' }, 'Dataset to Export'),
              e('div', { className: 'd-flex gap-2' }, [
                e('label', { className: ['btn', exportDataset === 'cleaned' ? 'btn-primary' : 'btn-outline'].join(' '), style: { flex: 1 } },
                  e('input', { type: 'radio', name: 'dataset', value: 'cleaned', checked: exportDataset === 'cleaned', onChange: e => setExportDataset('cleaned'), className: 'me-2' }),
                  e(Icon, { name: 'checkCircle', size: 18, className: 'me-2' }), 'Cleaned'
                ),
                e('label', { className: ['btn', exportDataset === 'original' ? 'btn-primary' : 'btn-outline'].join(' '), style: { flex: 1 } },
                  e('input', { type: 'radio', name: 'dataset', value: 'original', checked: exportDataset === 'original', onChange: e => setExportDataset('original'), className: 'me-2' }),
                  e(Icon, { name: 'database', size: 18, className: 'me-2' }), 'Original'
                ),
              ]),
            ]),

            e('div', { className: 'mb-3 form-check' }, [
              e('input', {
                type: 'checkbox',
                className: 'form-check-input',
                checked: includeIndex,
                onChange: e => setIncludeIndex(e.target.checked),
              }),
              e('label', { className: 'form-check-label' }, 'Include row index in export'),
            ]),

            e('div', { className: 'mb-3 p-3 bg-tertiary rounded' }, [
              e('h6', { className: 'mb-2' }, 'Dataset Preview'),
              e('div', { className: 'row g-2 text-muted small' }, [
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'fw-semibold' }, (exportDataset === 'cleaned' ? 'Processed' : 'Original')),
                  e('div', null, exportDataset === 'cleaned' ? 'Cleaned dataset' : 'Original dataset'),
                ]),
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'fw-semibold' }, `${dataset.rows.toLocaleString()} rows`),
                  e('div', null, `${dataset.columns} columns`),
                ]),
              ]),
            ]),

            e('div', { className: 'd-flex gap-2' }, [
              e(Button, { variant: 'primary', size: 'lg', leftIcon: 'download', onClick: handleExport, disabled: loading, loading, className: 'flex-1' }, `Export ${exportFormat.toUpperCase()}`),
            ]),
          ])
        ),

        e('div', { key: 'export-preview', className: 'col-12 col-lg-7' },
          e(Card, { header: 'Data Preview' }, [
            e('p', { className: 'text-muted small mb-3' }, `Showing first 100 rows of ${exportDataset} dataset (${exportFormat.toUpperCase()} format)`),
            e('div', { style: { maxHeight: 500, overflow: 'auto' } },
              e(Table, {
                data: [],
                columns: [],
                pagination: false,
                emptyMessage: 'Preview data will be loaded here',
              })
            ),
          ])
        ),
      ]),
    ]),

    activeTab === 'report' && e('div', { key: 'report', className: 'tab-content active' }, [
      e('div', { className: 'row g-4' }, [
        e('div', { key: 'report-actions', className: 'col-12 col-lg-4' },
          e(Card, { header: 'Report Options' }, [
            e('div', { className: 'mb-3' }, [
              e('label', { className: 'form-label' }, 'Report Type'),
              e('select', { className: 'form-select', value: 'full', onChange: e => {} }, [
                e('option', { value: 'full' }, 'Full Report (All Sections)'),
                e('option', { value: 'summary' }, 'Summary Only'),
                e('option', { value: 'quality' }, 'Data Quality Focus'),
                e('option', { value: 'operations' }, 'Operations Log Focus'),
              ]),
            ]),
            e('div', { className: 'mb-3 form-check' }, [
              e('input', { type: 'checkbox', className: 'form-check-input', checked: true }),
              e('label', { className: 'form-check-label' }, 'Include Quality Score'),
            ]),
            e('div', { className: 'mb-3 form-check' }, [
              e('input', { type: 'checkbox', className: 'form-check-input', checked: true }),
              e('label', { className: 'form-check-label' }, 'Include Before/After Comparison'),
            ]),
            e('div', { className: 'mb-3 form-check' }, [
              e('input', { type: 'checkbox', className: 'form-check-input', checked: true }),
              e('label', { className: 'form-check-label' }, 'Include Operations Log'),
            ]),
            e('div', { className: 'mb-3 form-check' }, [
              e('input', { type: 'checkbox', className: 'form-check-input', checked: true }),
              e('label', { className: 'form-check-label' }, 'Include Visualizations'),
            ]),
            e('div', { className: 'mb-3 form-check' }, [
              e('input', { type: 'checkbox', className: 'form-check-input' }),
              e('label', { className: 'form-check-label' }, 'Include Recommendations'),
            ]),
            e('div', { className: 'd-flex gap-2' }, [
              e(Button, { variant: 'primary', size: 'lg', leftIcon: 'fileText', onClick: handleGenerateReport, disabled: generatingReport, loading: generatingReport, className: 'flex-1' }, 'Generate Report'),
            ]),
          ])
        ),

        e('div', { key: 'report-preview', className: 'col-12 col-lg-8' },
          reportData ? e(Card, { header: 'Report Preview' }, [
            e('div', { style: { maxHeight: 600, overflow: 'auto' } }, [
              e('h3', { className: 'mb-1' }, `Data Preprocessing Report`),
              e('p', { className: 'text-muted mb-4' }, `Generated for ${dataset.filename} on ${new Date().toLocaleString()}`),
              e('hr', { className: 'my-3' }),

              e('h4', { className: 'mb-3' }, '1. Dataset Overview'),
              e('div', { className: 'row g-3 mb-4' }, [
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'text-muted small' }, 'Filename'),
                  e('div', { className: 'fw-semibold' }, dataset.filename),
                ]),
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'text-muted small' }, 'Rows × Columns'),
                  e('div', { className: 'fw-semibold' }, `${reportData.comparison?.rows?.before?.toLocaleString()} × ${reportData.comparison?.columns?.before}`),
                ]),
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'text-muted small' }, 'Target Column'),
                  e('div', { className: 'fw-semibold' }, reportData.target || 'Not set'),
                ]),
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'text-muted small' }, 'Learning Task'),
                  e('div', { className: 'fw-semibold' }, reportData.task || 'Not set'),
                ]),
              ]),

              e('h4', { className: 'mb-3' }, '2. Data Quality Score'),
              e('div', { className: 'd-flex align-items-center gap-4 mb-4' }, [
                e(QualityScore, { score: reportData.quality_score?.score || 0, grade: reportData.quality_score?.grade || 'F', size: 'md', showDetails: true }),
              ]),

              e('h4', { className: 'mb-3' }, '3. Before/After Comparison'),
              e('div', { className: 'row g-3 mb-4' }, [
                ['rows', 'columns', 'missing', 'duplicates'].map(metric => e('div', { key: metric, className: 'col-3' }, [
                  e('div', { className: 'text-muted small' }, metric.charAt(0).toUpperCase() + metric.slice(1)),
                  e('div', { className: 'd-flex justify-content-between' }, [
                    e('span', null, `Before: ${reportData.comparison?.[metric]?.before?.toLocaleString()}`),
                    e('span', null, `After: ${reportData.comparison?.[metric]?.after?.toLocaleString()}`),
                  ]),
                ])),
              ]),

              e('h4', { className: 'mb-3' }, '4. Operations Applied'),
              e('div', { className: 'mb-4' },
                e('ul', { className: 'mb-0' },
                  Object.entries(reportData.operations_applied || {}).map(([op, count]) => e('li', { key: op }, `${op.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${count} time(s)`))
                )
              ),

              e('h4', { className: 'mb-3' }, '5. Issues Detected'),
              e('div', { className: 'row g-3 mb-4' }, [
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'text-muted small' }, 'Total Issues'),
                  e('div', { className: 'fw-semibold' }, reportData.issues_detected || 0),
                ]),
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'text-muted small' }, 'By Severity'),
                  e('div', { className: 'd-flex gap-2 flex-wrap' },
                    Object.entries(reportData.issues_by_severity || {}).map(([sev, count]) => e('span', { key: sev, className: 'badge badge-secondary' }, `${sev}: ${count}`))
                  ),
                ]),
              ]),

              e('h4', { className: 'mb-3' }, '6. Processing History'),
              e('div', { className: 'mb-4' },
                e(Table, {
                  data: reportData.history || [],
                  columns: [
                    { key: 'timestamp', label: 'Time', width: 180 },
                    { key: 'operations_count', label: 'Operations' },
                    { key: 'rows_before', label: 'Rows Before' },
                    { key: 'rows_after', label: 'Rows After' },
                  ],
                  pagination: false,
                  renderCell: (value, col, row) => {
                    if (col.key === 'timestamp') return new Date(value * 1000).toLocaleString();
                    return value;
                  },
                })
              ),

              e('div', { className: 'd-flex gap-2 mt-4' }, [
                e(Button, { variant: 'primary', leftIcon: 'download', onClick: () => onExport?.('html') }, 'Download HTML'),
                e(Button, { variant: 'outline', leftIcon: 'download', onClick: () => onExport?.('pdf') }, 'Download PDF'),
              ]),
            ]),
          ]) : e(Card, { header: 'Report Preview' }, [
            e('div', { className: 'empty-state py-5' }, [
              e(Icon, { name: 'fileText', size: 48, className: 'text-muted mb-3' }),
              e('h5', null, 'No Report Generated'),
              e('p', { className: 'text-muted' }, 'Configure options and click "Generate Report" to create a comprehensive data quality and preprocessing report.'),
            ]),
          ])
        ),
      ]),
    ]),
  ]);
};

window.ExportReports = ExportReports;