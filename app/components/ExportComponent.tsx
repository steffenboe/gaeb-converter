'use client';

import { useState } from 'react';
import { GAEBData } from '../lib/gaeb-parser';
import { ExcelExporter } from '../lib/excel-exporter';

interface ExportComponentProps {
  data: GAEBData[];
}

export default function ExportComponent({ data }: ExportComponentProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [includeDescription, setIncludeDescription] = useState(true);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');

  if (data.length === 0) {
    return null;
  }

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const options = {
        includeDescription,
        fileName: 'GAEB_Export'
      };

      if (exportFormat === 'excel') {
        ExcelExporter.exportToExcel(data, options);
      } else {
        ExcelExporter.exportToCSV(data, options);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const totalPositions = data.reduce((sum, file) => sum + file.totalPositions, 0);
  const totalCategories = data.reduce((sum, file) => 
    sum + file.positions.filter(p => p.type === 'title').length, 0);
  const totalItems = data.reduce((sum, file) => 
    sum + file.positions.filter(p => p.type === 'position').length, 0);

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Export Produktionsliste
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Erstelle Excel-Produktionsliste mit {data.length} Datei(en) - {totalPositions} Positionen ({totalCategories} Kategorien, {totalItems} Artikel)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Export Format Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Format:
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'excel' | 'csv')}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Export Options
          </h4>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeDescription}
              onChange={(e) => setIncludeDescription(e.target.checked)}
              className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Include detailed descriptions
            </span>
          </label>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Export Contents
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div>• Position numbers and hierarchy</div>
            <div>• Product names and categories</div>
            <div>• Quantities from GAEB</div>
            <div>• Workshop tracking columns (zugeschnitten, gebaut)</div>
            <div>• Procurement tracking columns (Zukauf, bestellt am, geliefert)</div>
            <div>• Notes column for remarks</div>
            {includeDescription && <div>• Detailed descriptions as comments</div>}
          </div>
        </div>
      </div>

      {/* Export Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p>
          Excel-Export erstellt eine Produktionsliste mit Spalten für Werkstatt (zugeschnitten, gebaut) und Zukauf (Produkt, Stückzahl, bestellt am, geliefert).
          Die Liste kann zur Produktionsplanung und -verfolgung verwendet werden.
        </p>
      </div>
    </div>
  );
}