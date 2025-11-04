'use client';

import { useState } from 'react';
import Image from "next/image";
import FileUpload from "./components/FileUpload";
import GAEBViewer from "./components/GAEBViewer";
import ExportComponent from "./components/ExportComponent";
import { GAEBData } from "./lib/gaeb-parser";

export default function Home() {
  const [processedFiles, setProcessedFiles] = useState<GAEBData[]>([]);

  const handleFileProcessed = (gaebData: GAEBData) => {
    setProcessedFiles(prev => {
      // Remove any existing file with the same name and add the new one
      const filtered = prev.filter(f => f.fileName !== gaebData.fileName);
      return [...filtered, gaebData];
    });
  };

  const clearFiles = () => {
    setProcessedFiles([]);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            GAEB Converter
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload and process GAEB files locally in your browser. 
            Supports .gaeb, .d83, .p83, and .x83 formats.
          </p>
        </header>

        {/* File Upload Section */}
        <div className="mb-8">
          <FileUpload onFileProcessed={handleFileProcessed} />
        </div>

        {/* Clear Files Button */}
        {processedFiles.length > 0 && (
          <div className="text-center mb-8">
            <button
              onClick={clearFiles}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear All Files
            </button>
          </div>
        )}

        {/* GAEB Viewer */}
        <GAEBViewer data={processedFiles} />

        {/* Export Component */}
        <ExportComponent data={processedFiles} />

        {/* Footer */}
        <footer className="mt-16 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            GAEB Converter - Verarbeitung von GAEB-Dateien im Browser
          </div>
        </footer>
      </div>
    </div>
  );
}
