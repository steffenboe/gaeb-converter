// GAEB file types and interfaces
export interface GAEBHeader {
  version?: string;
  project?: string;
  description?: string;
  date?: string;
  format?: string; // D81, D83, D84, X83, X84, etc.
}

export interface GAEBPosition {
  id: string;
  positionNumber?: string;
  title: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  level: number;
  parent?: string;
  children?: string[];
  type: 'title' | 'position' | 'text' | 'calculation';
}

export interface GAEBData {
  header: GAEBHeader;
  positions: GAEBPosition[];
  rawContent: string;
  fileName: string;
  processedAt: string;
  totalPositions: number;
}

// Enhanced GAEB file parser with XML support
export class GAEBParser {
  static parse(content: string, fileName: string): GAEBData {
    // Detect if this is an XML-based GAEB file (X83, X84, etc.)
    if (content.trim().startsWith('<?xml') || content.includes('<GAEB')) {
      return this.parseXMLGAEB(content, fileName);
    } else {
      return this.parseTextGAEB(content, fileName);
    }
  }

  private static parseXMLGAEB(content: string, fileName: string): GAEBData {
    const header: GAEBHeader = {};
    const positions: GAEBPosition[] = [];

    // Detect XML GAEB format
    header.format = this.detectXMLGAEBFormat(content);

    try {
      // Create a simple XML parser using DOMParser (available in browsers)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');

      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.warn('XML parsing error:', parseError.textContent);
        // Fall back to text parsing if XML parsing fails
        return this.parseTextGAEB(content, fileName);
      }

      // Extract header information
      const gaebElement = xmlDoc.querySelector('GAEB');
      if (gaebElement) {
        header.version = gaebElement.getAttribute('xmlns') || 'Unknown';
      }

      // Extract project information from Award element
      const awardElement = xmlDoc.querySelector('Award');
      if (awardElement) {
        // Try to find project name in various possible locations
        const projectElement = awardElement.querySelector('Project') || 
                              awardElement.querySelector('Name') ||
                              awardElement.querySelector('Title');
        if (projectElement) {
          header.project = projectElement.textContent?.trim();
        }
      }

      // Extract BoQ (Bill of Quantities) structure
      const boqElement = xmlDoc.querySelector('BoQ');
      if (boqElement) {
        // Find all categories (BoQCtgy elements)
        const categories = boqElement.querySelectorAll('BoQCtgy');
        
        categories.forEach((category, categoryIndex) => {
          // Use the RNoPart attribute from the category instead of sequential index
          const categoryRNoPart = category.getAttribute('RNoPart') || `${categoryIndex + 1}`;
          const categoryNumber = parseInt(categoryRNoPart);
          const categoryPosition = this.parseXMLCategory(category, categoryIndex, categoryNumber);
          if (categoryPosition) {
            positions.push(categoryPosition);
          }

          // Find all items within this category
          const items = category.querySelectorAll('Item');
          items.forEach((item, itemIndex) => {
            const itemNumber = itemIndex + 1;
            const itemPosition = this.parseXMLItem(item, itemIndex, categoryPosition?.id, categoryNumber, itemNumber);
            if (itemPosition) {
              positions.push(itemPosition);
            }
          });
        });
      }

    } catch (error) {
      console.error('Error parsing XML GAEB:', error);
      // Fall back to text parsing if XML parsing fails
      return this.parseTextGAEB(content, fileName);
    }

    return {
      header,
      positions,
      rawContent: content,
      fileName,
      processedAt: new Date().toISOString(),
      totalPositions: positions.length
    };
  }

  private static parseXMLCategory(categoryElement: Element, index: number, categoryNumber: number): GAEBPosition | null {
    try {
      const id = categoryElement.getAttribute('ID') || `cat_${index + 1}`;
      const rNoPart = categoryElement.getAttribute('RNoPart') || `${index + 1}`;

      // Extract category title from LblTx > p > span
      const lblTxElement = categoryElement.querySelector('LblTx');
      let title = 'Unknown Category';
      
      if (lblTxElement) {
        const spanElement = lblTxElement.querySelector('span');
        if (spanElement) {
          title = spanElement.textContent?.trim() || title;
        } else {
          // Fallback: try to get text from p element or LblTx directly
          const pElement = lblTxElement.querySelector('p');
          if (pElement) {
            title = pElement.textContent?.trim() || title;
          } else {
            title = lblTxElement.textContent?.trim() || title;
          }
        }
      }

      return {
        id,
        positionNumber: `${categoryNumber}`, // Use hierarchical numbering like 1, 2, 3
        title,
        level: 0, // Categories are top-level
        type: 'title'
      };

    } catch (error) {
      console.warn('Error parsing XML category:', error);
      return null;
    }
  }

  private static parseXMLItem(itemElement: Element, index: number, parentCategoryId?: string, categoryNumber?: number, itemNumber?: number): GAEBPosition | null {
    try {
      const id = itemElement.getAttribute('ID') || `item_${index + 1}`;
      const rNoPart = itemElement.getAttribute('RNoPart') || `${index + 1}`;

      // Extract quantity
      const qtyElement = itemElement.querySelector('Qty');
      const quantity = qtyElement ? parseFloat(qtyElement.textContent || '0') : undefined;

      // Extract unit
      const quElement = itemElement.querySelector('QU');
      const unit = quElement ? quElement.textContent?.trim() : undefined;

      // Extract description
      let title = `Position ${rNoPart}`;
      let description = '';

      const descriptionElement = itemElement.querySelector('Description');
      if (descriptionElement) {
        // Try to get outline text first (short description)
        const outlineTextElement = descriptionElement.querySelector('OutlineText TextOutlTxt span');
        if (outlineTextElement) {
          title = outlineTextElement.textContent?.trim() || title;
        }

        // Get detailed text as description
        const detailTextElement = descriptionElement.querySelector('DetailTxt');
        if (detailTextElement) {
          // Extract all text content from paragraphs
          const paragraphs = detailTextElement.querySelectorAll('p span');
          const textParts: string[] = [];
          
          paragraphs.forEach(p => {
            const text = p.textContent?.trim();
            if (text && text.length > 0) {
              textParts.push(text);
            }
          });
          
          if (textParts.length > 0) {
            description = textParts.join(' ');
            // If we didn't get a good title from outline, use first part of description
            if (title === `Position ${rNoPart}` && textParts[0]) {
              title = textParts[0].substring(0, 100) + (textParts[0].length > 100 ? '...' : '');
            }
          }
        }
      }

      // Generate hierarchical position number like 1.1, 1.2, 2.1, 2.2, etc.
      const hierarchicalPositionNumber = categoryNumber && itemNumber ? 
        `${categoryNumber}.${itemNumber}` : 
        rNoPart;

      return {
        id,
        positionNumber: hierarchicalPositionNumber,
        title,
        description: description || undefined,
        unit,
        quantity,
        level: 1, // Items are under categories
        type: 'position',
        parent: parentCategoryId
      };

    } catch (error) {
      console.warn('Error parsing XML item:', error);
      return null;
    }
  }

  private static detectXMLGAEBFormat(content: string): string {
    if (content.includes('DA83/3.3')) return 'X83';
    if (content.includes('DA84')) return 'X84';
    if (content.includes('DA81')) return 'X81';
    if (content.includes('<GAEB')) return 'XML GAEB';
    return 'XML';
  }

  private static parseTextGAEB(content: string, fileName: string): GAEBData {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const header: GAEBHeader = {};
    const positions: GAEBPosition[] = [];

    // Detect GAEB format for text-based files
    header.format = this.detectGAEBFormat(content);

    let currentSection = 'header';
    let positionCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (!line) continue;

      // Try to detect header information
      if (currentSection === 'header') {
        if (line.toLowerCase().includes('project') || line.toLowerCase().includes('projekt')) {
          header.project = this.extractValue(line);
        } else if (line.toLowerCase().includes('version')) {
          header.version = this.extractValue(line);
        } else if (line.toLowerCase().includes('date') || line.toLowerCase().includes('datum')) {
          header.date = this.extractValue(line);
        } else if (line.toLowerCase().includes('description') || line.toLowerCase().includes('beschreibung')) {
          header.description = this.extractValue(line);
        }

        // Switch to positions section if we detect position-like content
        if (this.looksLikePosition(line)) {
          currentSection = 'positions';
        }
      }

      // Parse positions
      if (currentSection === 'positions' && this.looksLikePosition(line)) {
        const position = this.parsePosition(line, positionCounter++, lines, i);
        if (position) {
          positions.push(position);
        }
      }
    }

    return {
      header,
      positions,
      rawContent: content,
      fileName,
      processedAt: new Date().toISOString(),
      totalPositions: positions.length
    };
  }

  private static detectGAEBFormat(content: string): string {
    // Try to detect the GAEB format from content
    if (content.includes('D81') || content.includes('d81')) return 'D81';
    if (content.includes('D83') || content.includes('d83')) return 'D83';
    if (content.includes('D84') || content.includes('d84')) return 'D84';
    if (content.includes('P81') || content.includes('p81')) return 'P81';
    if (content.includes('P83') || content.includes('p83')) return 'P83';
    if (content.includes('X81') || content.includes('x81')) return 'X81';
    if (content.includes('X83') || content.includes('x83')) return 'X83';
    return 'Unknown';
  }

  private static extractValue(line: string): string {
    const parts = line.split(':');
    return parts.length > 1 ? parts.slice(1).join(':').trim() : line;
  }

  private static looksLikePosition(line: string): boolean {
    // Enhanced heuristics to identify position lines based on common GAEB patterns
    const trimmedLine = line.trim();
    
    // Skip empty lines and obvious header content
    if (!trimmedLine || trimmedLine.length < 3) return false;
    if (trimmedLine.toLowerCase().includes('header') || trimmedLine.toLowerCase().includes('projekt')) return false;
    
    // Common GAEB position patterns:
    return (
      // Position numbers: 1, 1.1, 1.1.1, 01, 001, etc.
      /^\s*\d+(\.\d+)*[A-Za-z]?\s+/.test(line) ||
      
      // Position numbers with letters: A1, B2.1, etc.
      /^\s*[A-Z]\d+(\.\d+)*\s+/.test(line) ||
      
      // Lines with typical GAEB units
      /\b(m²|m³|lfm|kg|t|Stk|psch|St|qm|cbm|to|lfd|Std|h|m|cm|mm|l|kWh|Pfl|bgl)\b/i.test(line) ||
      
      // Lines with currency/price information
      /\d+[,\.]\d+\s*(€|EUR|DM)/i.test(line) ||
      
      // Lines that start with numbers and contain descriptive text
      /^\s*\d+\s+[A-ZÜÄÖ]/.test(line) ||
      
      // Position with quantities (number + unit)
      /\d+[,\.]?\d*\s+(m²|m³|lfm|kg|t|Stk|psch|St|qm|cbm|to|lfd|Std|h|m)\b/i.test(line) ||
      
      // Common construction terms that indicate positions
      /\b(Beton|Mauerwerk|Estrich|Fliesen|Putz|Anstrich|Dämmung|Installation|Montage|Lieferung)\b/i.test(line)
    );
  }

  private static parsePosition(line: string, index: number, allLines: string[], currentIndex: number): GAEBPosition | null {
    try {
      const trimmedLine = line.trim();
      
      // Extract position number with more sophisticated patterns
      const positionNumberPatterns = [
        /^\s*(\d+(?:\.\d+)*[A-Za-z]?)\s+/, // 1, 1.1, 1.1.1, 1a, etc.
        /^\s*([A-Z]\d+(?:\.\d+)*)\s+/, // A1, B2.1, etc.
        /^\s*(\d{2,3})\s+/, // 01, 001, etc.
      ];
      
      let positionNumber: string | undefined;
      for (const pattern of positionNumberPatterns) {
        const match = line.match(pattern);
        if (match) {
          positionNumber = match[1];
          break;
        }
      }

      // Extract ID (use position number or generate one)
      const id = positionNumber || `pos_${index + 1}`;

      // Enhanced number extraction with better patterns
      const numberPatterns = [
        /(\d+[,\.]\d+)/g, // Decimal numbers
        /(\d+)/g // Integers
      ];
      
      let numbers: string[] = [];
      for (const pattern of numberPatterns) {
        const matches = line.match(pattern);
        if (matches) {
          numbers = matches;
          break;
        }
      }
      
      const cleanNumbers = numbers.map(n => parseFloat(n.replace(',', '.')));

      // Enhanced unit extraction with more German construction units
      const unitPattern = /\b(m²|m³|lfm|kg|t|Stk|psch|St|qm|cbm|to|lfd|Std|h|m|cm|mm|l|kWh|Pfl|bgl|EUR|€|DM)\b/i;
      const unitMatch = line.match(unitPattern);
      const unit = unitMatch ? unitMatch[0] : undefined;

      // Enhanced currency extraction
      const currencyPatterns = [
        /(\d+[,\.]\d+)\s*(?:€|EUR)/i,
        /(\d+[,\.]\d+)\s*DM/i,
        /€\s*(\d+[,\.]\d+)/i,
        /EUR\s*(\d+[,\.]\d+)/i
      ];
      
      let currencyAmount: number | undefined;
      for (const pattern of currencyPatterns) {
        const match = line.match(pattern);
        if (match) {
          currencyAmount = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }

      // Enhanced position type detection
      let type: GAEBPosition['type'] = 'position';
      
      if (trimmedLine.match(/^\s*\d+\s+[A-ZÜÄÖ][A-ZÜÄÖ\s]+$/)) {
        type = 'title'; // Likely a section title
      } else if (!positionNumber && trimmedLine.length > 80 && !currencyAmount) {
        type = 'text'; // Long text without position number
      } else if (currencyAmount !== undefined || unit) {
        type = 'position'; // Has pricing or units
      } else if (trimmedLine.match(/\b(gesamt|summe|total|zwischensumme)\b/i)) {
        type = 'calculation'; // Summary/calculation line
      }

      // Enhanced title extraction
      let title = trimmedLine;
      
      // Remove position number from beginning
      if (positionNumber) {
        title = title.replace(new RegExp(`^\\s*${positionNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`), '');
      }
      
      // Remove price information from end
      if (currencyAmount) {
        const pricePattern = new RegExp(`\\d+[,\\.]\\d*\\s*(?:€|EUR|DM)`, 'gi');
        title = title.replace(pricePattern, '');
      }
      
      // Remove quantities with units
      if (unit && unit !== '€' && unit !== 'EUR' && unit !== 'DM') {
        const quantityPattern = new RegExp(`\\d+[,\\.]?\\d*\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
        title = title.replace(quantityPattern, '');
      }
      
      // Clean up title
      title = title.replace(/\s+/g, ' ').trim();
      
      // If title is empty or too short, use a cleaned version of original line
      if (!title || title.length < 3) {
        title = trimmedLine.replace(/^\d+[\.\s]*/, '').trim() || `Position ${index + 1}`;
      }

      // Determine hierarchy level based on indentation and numbering
      const leadingSpaces = line.length - line.trimStart().length;
      let level = Math.floor(leadingSpaces / 4);
      
      // Also consider position number depth
      if (positionNumber) {
        const dots = (positionNumber.match(/\./g) || []).length;
        level = Math.max(level, dots);
      }

      // Look ahead for description in next lines (common in GAEB files)
      let description = '';
      for (let i = currentIndex + 1; i < Math.min(currentIndex + 3, allLines.length); i++) {
        const nextLine = allLines[i];
        if (nextLine && !this.looksLikePosition(nextLine) && nextLine.trim().length > 10) {
          description = nextLine.trim();
          break;
        }
      }

      // Determine quantity and pricing
      let quantity: number | undefined;
      let unitPrice: number | undefined;
      let totalPrice: number | undefined;

      if (type === 'position' && cleanNumbers.length > 0) {
        if (currencyAmount && cleanNumbers.length === 1) {
          // Only one number and a price - likely quantity + unit price
          quantity = cleanNumbers[0];
          unitPrice = currencyAmount;
          totalPrice = quantity * unitPrice;
        } else if (currencyAmount && cleanNumbers.length >= 2) {
          // Multiple numbers - first is quantity, currency is unit price
          quantity = cleanNumbers[0];
          unitPrice = currencyAmount;
          totalPrice = cleanNumbers[1]; // Or calculate if needed
        } else if (cleanNumbers.length >= 2 && !currencyAmount) {
          // No explicit currency but multiple numbers
          quantity = cleanNumbers[0];
          // Try to identify which number might be a price
          const largerNumber = Math.max(...cleanNumbers.slice(1));
          if (largerNumber > 1) {
            totalPrice = largerNumber;
            unitPrice = totalPrice / quantity;
          }
        } else if (cleanNumbers.length === 1 && !currencyAmount) {
          quantity = cleanNumbers[0];
        }
      }

      const position: GAEBPosition = {
        id,
        positionNumber,
        title,
        description: description || undefined,
        unit: unit && unit !== '€' && unit !== 'EUR' && unit !== 'DM' ? unit : undefined,
        level,
        type,
        quantity,
        unitPrice,
        totalPrice,
      };

      return position;
    } catch (error) {
      console.warn('Failed to parse position:', line, error);
      return null;
    }
  }

  // Utility method to format currency
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  // Utility method to format quantities
  static formatQuantity(quantity: number, unit?: string): string {
    const formattedQuantity = new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 2
    }).format(quantity);
    
    return unit ? `${formattedQuantity} ${unit}` : formattedQuantity;
  }
}