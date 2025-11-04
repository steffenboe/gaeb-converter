import * as XLSX from 'xlsx';
import { GAEBData, GAEBPosition } from './gaeb-parser';

export interface ExcelExportOptions {
  includeDescription?: boolean;
  fileName?: string;
}

export class ExcelExporter {
  static exportToExcel(gaebFiles: GAEBData[], options: ExcelExportOptions = {}): void {
    const {
      includeDescription = true,
      fileName = 'GAEB_Export'
    } = options;

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = this.createSummarySheet(gaebFiles);
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Create a sheet for each GAEB file
    gaebFiles.forEach((gaebFile, index) => {
      const sheetData = this.createPositionSheet(gaebFile, includeDescription);
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set custom column widths for production tracking format
      worksheet['!cols'] = [
        { wch: 12 }, // Position
        { wch: 50 }, // Produkt
        { wch: 10 }, // Stückzahl
        { wch: 12 }, // zugeschnitten
        { wch: 10 }, // gebaut
        { wch: 3 },  // separator
        { wch: 40 }, // Zukauf Produkt
        { wch: 10 }, // Zukauf Stückzahl
        { wch: 12 }, // bestellt am
        { wch: 10 }, // geliefert
        { wch: 30 }  // bemerkungen
      ];

      // Add some basic styling
      if (worksheet['A1']) {
        worksheet['A1'].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'left' }
        };
      }

      // Style the section headers
      if (worksheet['A3']) {
        worksheet['A3'].s = { font: { bold: true } };
      }
      if (worksheet['F3']) {
        worksheet['F3'].s = { font: { bold: true } };
      }

      // Style the column headers
      const headerRowIndex = 5; // Row 5 (0-indexed is 4)
      const headers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
      headers.forEach(col => {
        const cellRef = col + headerRowIndex;
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'E5E7EB' } },
            alignment: { horizontal: 'center' }
          };
        }
      });

      // Style category rows (titles) with blue background
      const dataStartRow = 6; // Data starts at row 6 (0-indexed is 5)
      gaebFile.positions.forEach((position, positionIndex) => {
        const rowIndex = dataStartRow + positionIndex;
        
        if (position.type === 'title') {
          // Apply blue background to all cells in category rows
          headers.forEach(col => {
            const cellRef = col + rowIndex;
            if (worksheet[cellRef]) {
              worksheet[cellRef].s = {
                font: { bold: true, color: { rgb: '1E40AF' } }, // Blue text
                fill: { fgColor: { rgb: 'DBEAFE' } }, // Light blue background
                alignment: { horizontal: 'left' }
              };
            }
          });
        }
      });
      
      // Clean filename for sheet name (Excel sheet names have restrictions)
      const cleanFileName = gaebFile.fileName
        .replace(/[\\/:*?"<>|]/g, '_')
        .substring(0, 31); // Excel sheet name limit
      
      const sheetName = gaebFiles.length > 1 ? `File_${index + 1}_${cleanFileName}` : cleanFileName;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const finalFileName = `${fileName}_${timestamp}.xlsx`;

    // Save the file
    XLSX.writeFile(workbook, finalFileName);
  }

  private static createSummarySheet(gaebFiles: GAEBData[]): any[][] {
    const data: any[][] = [
      ['GAEB Produktionsliste - Übersicht'],
      [''],
      ['Datei', 'Format', 'Kategorien', 'Artikel', 'Gesamt Positionen', 'Bearbeitet am']
    ];

    gaebFiles.forEach(file => {
      const categories = file.positions.filter(p => p.type === 'title').length;
      const items = file.positions.filter(p => p.type === 'position').length;
      const totalQuantity = file.positions
        .filter(p => p.type === 'position' && p.quantity)
        .reduce((sum, p) => sum + (p.quantity || 0), 0);
      
      data.push([
        file.fileName,
        file.header.format || 'X83',
        categories,
        items,
        file.totalPositions,
        new Date(file.processedAt).toLocaleString('de-DE')
      ]);
    });

    // Add summary row
    if (gaebFiles.length > 1) {
      const totalCategories = gaebFiles.reduce((sum, file) => 
        sum + file.positions.filter(p => p.type === 'title').length, 0);
      const totalItems = gaebFiles.reduce((sum, file) => 
        sum + file.positions.filter(p => p.type === 'position').length, 0);
      const totalPositions = gaebFiles.reduce((sum, file) => sum + file.totalPositions, 0);

      data.push(['']);
      data.push([
        'GESAMT',
        '',
        totalCategories,
        totalItems,
        totalPositions,
        ''
      ]);
    }

    return data;
  }

  private static createPositionSheet(gaebFile: GAEBData, includeDescription: boolean): any[][] {
    const data: any[][] = [
      // Project header
      [`Projekt: ${gaebFile.header.project || gaebFile.fileName}`, '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['Werkstatt', '', '', '', '', 'Zukauf', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      // Column headers
      ['Position', 'Produkt', 'Stückzahl', 'zugeschnitten', 'gebaut', '', 'Produkt', 'Stückzahl', 'bestellt am', 'geliefert', '']
    ];

    // Add position data
    gaebFile.positions.forEach(position => {
      const row: any[] = [
        position.positionNumber || '',
        position.title,
        position.type === 'position' ? (position.quantity || '') : '',
        '', // zugeschnitten - empty for manual entry
        '', // gebaut - empty for manual entry
        '', // separator
        '', // Zukauf Produkt - empty for manual entry
        '', // Zukauf Stückzahl - empty for manual entry
        '', // bestellt am - empty for manual entry
        '', // geliefert - empty for manual entry
        ''  // bemerkungen - empty for manual entry
      ];

      data.push(row);
    });

    return data;
  }

  private static calculateColumnWidths(data: any[][]): any[] {
    if (data.length === 0) return [];
    
    const maxCols = Math.max(...data.map(row => row.length));
    const colWidths: any[] = [];

    for (let col = 0; col < maxCols; col++) {
      let maxWidth = 10; // Minimum width
      
      for (let row = 0; row < data.length; row++) {
        if (data[row][col] !== undefined) {
          const cellValue = String(data[row][col]);
          maxWidth = Math.max(maxWidth, cellValue.length + 2);
        }
      }
      
      // Limit maximum width
      maxWidth = Math.min(maxWidth, 50);
      colWidths.push({ wch: maxWidth });
    }

    return colWidths;
  }

  private static getTypeDisplayName(type: GAEBPosition['type']): string {
    switch (type) {
      case 'title': return 'Category';
      case 'position': return 'Position';
      case 'text': return 'Text';
      case 'calculation': return 'Calculation';
      default: return type;
    }
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  // Method to generate CSV as alternative
  static exportToCSV(gaebFiles: GAEBData[], options: ExcelExportOptions = {}): void {
    const {
      fileName = 'GAEB_Export'
    } = options;

    let csvContent = '';
    
    gaebFiles.forEach((file, fileIndex) => {
      if (fileIndex > 0) csvContent += '\n\n';
      
      csvContent += `File: ${file.fileName}\n`;
      csvContent += `Format: ${file.header.format || ''}\n`;
      csvContent += `Project: ${file.header.project || ''}\n\n`;
      
      csvContent += 'Position,Type,Title,Description,Quantity,Unit\n';
      
      file.positions.forEach(position => {
        const row = [
          position.positionNumber || '',
          this.getTypeDisplayName(position.type),
          `"${position.title.replace(/"/g, '""')}"`,
          `"${(position.description || '').replace(/"/g, '""')}"`,
          position.quantity || '',
          position.unit || ''
        ].join(',');
        
        csvContent += row + '\n';
      });
    });

    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}