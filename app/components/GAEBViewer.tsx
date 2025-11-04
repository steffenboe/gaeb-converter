'use client';

import { GAEBData, GAEBPosition } from '../lib/gaeb-parser';

interface GAEBViewerProps {
  data: GAEBData[];
}

export default function GAEBViewer({ data }: GAEBViewerProps) {
  if (data.length === 0) {
    return null;
  }

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatQuantity = (quantity?: number, unit?: string): string => {
    if (quantity === undefined) return '-';
    const formattedQuantity = new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 2
    }).format(quantity);
    
    return unit ? `${formattedQuantity} ${unit}` : formattedQuantity;
  };

  const getPositionTypeIcon = (type: GAEBPosition['type']) => {
    switch (type) {
      case 'title':
        return '📋';
      case 'position':
        return '📝';
      case 'text':
        return '📄';
      case 'calculation':
        return '🔢';
      default:
        return '•';
    }
  };

  const getPositionTypeColor = (type: GAEBPosition['type']) => {
    switch (type) {
      case 'title':
        return 'text-blue-600 dark:text-blue-400';
      case 'position':
        return 'text-green-600 dark:text-green-400';
      case 'text':
        return 'text-gray-600 dark:text-gray-400';
      case 'calculation':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderPosition = (position: GAEBPosition, index: number) => {
    const indentStyle = {
      paddingLeft: `${position.level * 24 + 16}px`
    };

    return (
      <div 
        key={index} 
        className="border-b border-gray-100 dark:border-gray-700 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        style={indentStyle}
      >
        <div className="flex items-start gap-3">
          {/* Position Type Icon */}
          <span className="text-lg mt-1 flex-shrink-0">
            {getPositionTypeIcon(position.type)}
          </span>

          <div className="flex-1 min-w-0">
            {/* Position Number and Title */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {position.positionNumber && (
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {position.positionNumber}
                    </span>
                  )}
                  <span className={`text-xs font-medium uppercase tracking-wide ${getPositionTypeColor(position.type)}`}>
                    {position.type}
                  </span>
                </div>
                <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 leading-tight">
                  {position.title}
                </h4>
                {position.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {position.description}
                  </p>
                )}
              </div>

              {/* Quantity and Unit Information */}
              {position.type === 'position' && (
                <div className="text-right flex-shrink-0 min-w-[120px]">
                  {/* Quantity */}
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span className="font-medium">Qty:</span> {position.quantity ? formatQuantity(position.quantity, position.unit) : 'N/A'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const calculateSummary = (positions: GAEBPosition[]) => {
    const items = positions.filter(p => p.type === 'position');
    const categories = positions.filter(p => p.type === 'title');
    
    return {
      totalItems: items.length,
      totalCategories: categories.length,
      totalPositions: positions.length
    };
  };

  return (
    <div className="mt-8 space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Processed GAEB Files ({data.reduce((total, file) => total + file.totalPositions, 0)} positions)
      </h2>
      
      {data.map((gaebFile, fileIndex) => (
        <div key={fileIndex} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* File Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {gaebFile.fileName}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{gaebFile.totalPositions} positions</span>
                <span>{new Date(gaebFile.processedAt).toLocaleString('de-DE')}</span>
              </div>
            </div>
            
            {/* Project Information and Pricing Summary */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Info */}
              {(gaebFile.header.project || gaebFile.header.description || gaebFile.header.version || gaebFile.header.format) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {gaebFile.header.project && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Project:</span>
                      <p className="text-gray-600 dark:text-gray-400">{gaebFile.header.project}</p>
                    </div>
                  )}
                  {gaebFile.header.version && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Version:</span>
                      <p className="text-gray-600 dark:text-gray-400">{gaebFile.header.version}</p>
                    </div>
                  )}
                  {gaebFile.header.format && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Format:</span>
                      <p className="text-gray-600 dark:text-gray-400">{gaebFile.header.format}</p>
                    </div>
                  )}
                  {gaebFile.header.description && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                      <p className="text-gray-600 dark:text-gray-400">{gaebFile.header.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {(() => {
                const summary = calculateSummary(gaebFile.positions);
                return (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">File Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Categories:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{summary.totalCategories}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Items:</span>
                        <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">{summary.totalItems}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Total Positions:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{summary.totalPositions}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Positions Table */}
          {gaebFile.positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Stückzahl
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {gaebFile.positions.map((position, index) => (
                    <tr key={index} className={`border-b border-gray-200 dark:border-gray-700 ${
                      position.type === 'title' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}>
                      {/* Position Number */}
                      <td className={`border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm ${
                        position.type === 'title' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}>
                        <span className={`font-mono ${
                          position.type === 'title' 
                            ? 'font-bold text-blue-700 dark:text-blue-300' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {position.positionNumber || ''}
                        </span>
                      </td>
                      
                      {/* Product/Title */}
                      <td className={`border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm ${
                        position.type === 'title' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}>
                        <span className={
                          position.type === 'title' 
                            ? 'font-bold text-blue-700 dark:text-blue-300 text-base' 
                            : 'text-gray-900 dark:text-gray-100'
                        }>
                          {position.title}
                        </span>
                        {position.description && position.type !== 'title' && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {position.description.substring(0, 150)}...
                          </div>
                        )}
                      </td>
                      
                      {/* Quantity */}
                      <td className={`border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-center ${
                        position.type === 'title' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}>
                        {position.type === 'position' ? (position.quantity || '') : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No positions found in this GAEB file. The file might use a format that requires additional parsing.
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  View raw content
                </summary>
                <pre className="mt-2 text-xs text-left text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-40">
                  {gaebFile.rawContent.slice(0, 1000)}
                  {gaebFile.rawContent.length > 1000 && '...'}
                </pre>
              </details>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}