'use client';

import { useState, useCallback } from 'react';
import { GAEBParser, GAEBData } from '../lib/gaeb-parser';

interface UseGAEBProcessorReturn {
  processedFiles: GAEBData[];
  isProcessing: boolean;
  error: string | null;
  processFile: (file: File) => Promise<GAEBData>;
  clearFiles: () => void;
  removeFile: (fileName: string) => void;
}

export function useGAEBProcessor(): UseGAEBProcessorReturn {
  const [processedFiles, setProcessedFiles] = useState<GAEBData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File): Promise<GAEBData> => {
    setIsProcessing(true);
    setError(null);

    try {
      // Validate file type
      const validExtensions = ['.gaeb', '.d83', '.p83', '.x83'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        throw new Error(`Unsupported file type: ${fileExtension}. Please use .gaeb, .d83, .p83, or .x83 files.`);
      }

      // Read file content
      const content = await readFileAsText(file);
      
      // Parse GAEB content
      const gaebData = GAEBParser.parse(content, file.name);
      
      // Add to processed files
      setProcessedFiles(prev => {
        // Remove any existing file with the same name
        const filtered = prev.filter(f => f.fileName !== file.name);
        return [...filtered, gaebData];
      });

      return gaebData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearFiles = useCallback(() => {
    setProcessedFiles([]);
    setError(null);
  }, []);

  const removeFile = useCallback((fileName: string) => {
    setProcessedFiles(prev => prev.filter(f => f.fileName !== fileName));
  }, []);

  return {
    processedFiles,
    isProcessing,
    error,
    processFile,
    clearFiles,
    removeFile,
  };
}

// Helper function to read file as text
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    // Try reading as text first
    // For binary GAEB files, we might need different encoding handling
    reader.readAsText(file, 'utf-8');
  });
}