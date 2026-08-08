'use client';

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import ViewportCanvas from './ViewportCanvas';

interface ZipPreviewerProps {
  zipUrl: string;
  sidebarFooter?: React.ReactNode;
}

export default function ZipPreviewer({ zipUrl, sidebarFooter }: ZipPreviewerProps) {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeUrls: string[] = [];

    async function loadZip() {
      try {
        setIsLoading(true);
        // Fetch the zip file
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error('Failed to fetch ZIP file');
        const blob = await response.blob();
        
        // Parse with JSZip
        const zip = await JSZip.loadAsync(blob);
        
        const extractedFiles: { name: string; url: string }[] = [];
        
        // Iterate through files
        for (const [filename, fileData] of Object.entries(zip.files)) {
          if (!fileData.dir) {
            const lowerName = filename.toLowerCase();
            const is3D = lowerName.endsWith('.stl') || lowerName.endsWith('.obj');
            const isImg = lowerName.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp)$/);
            const isVid = lowerName.match(/\.(mp4|mov|webm)$/);

            if (is3D || isImg || isVid) {
              // Extract the file into a blob URL
              const fileBlob = await fileData.async('blob');
              const url = URL.createObjectURL(fileBlob);
              extractedFiles.push({ name: filename, url });
              activeUrls.push(url);
            }
          }
        }
        
        setFiles(extractedFiles);
        if (extractedFiles.length > 0) {
          setSelectedFile(extractedFiles[0].name);
        } else {
          setError("No 3D files (.stl, .obj) found inside this archive.");
        }
        
      } catch (err: any) {
        console.error(err);
        setError("Error parsing ZIP file for preview.");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadZip();
    
    return () => {
      // Cleanup object URLs to prevent memory leaks
      activeUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [zipUrl]);

  if (isLoading) {
    return (
      <div className="flex-grow w-full h-[500px] md:h-[600px] lg:h-[700px] rounded-3xl overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.5)] border border-[#4b4732]/30 bg-[#0c0a04] flex flex-col items-center justify-center relative">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-yellow-400 font-bold uppercase tracking-widest text-[10px]">Extracting Archive in Browser...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow w-full h-[500px] md:h-[600px] lg:h-[700px] rounded-3xl overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.5)] border border-[#4b4732]/30 bg-[#0c0a04] flex flex-col items-center justify-center p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-neutral-600 mb-4">folder_zip</span>
        <p className="text-white font-bold uppercase tracking-widest text-xs mb-2">Preview Unavailable</p>
        <p className="text-neutral-500 text-sm max-w-sm">{error}</p>
      </div>
    );
  }

  const selectedFileData = files.find(f => f.name === selectedFile);

  const combinedFooter = (
    <div className="space-y-6">
      {/* File Selector Tabs */}
      {files.length > 1 && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 px-1">Archive Contents</h2>
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file.name)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${
                  selectedFile === file.name
                    ? 'bg-gradient-to-r from-[#ffe311] to-[#00fbfe] text-[#0c0a04]'
                    : 'bg-[#1a1c1c] border border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[10px] mr-1 align-middle">
                  {selectedFile === file.name ? 'check_circle' : 'deployed_code'}
                </span>
                {file.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {sidebarFooter}
    </div>
  );

  const renderPreview = () => {
    if (!selectedFileData) return null;
    
    const lowerName = selectedFileData.name.toLowerCase();
    const isImage = lowerName.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp)$/);
    const isVideo = lowerName.match(/\.(mp4|mov|webm)$/);

    if (isImage || isVideo) {
      return (
        <div className="flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden relative group font-body bg-[#0c0f0f]">
          {/* Media Viewport */}
          <div className="w-full min-h-[50vh] md:min-h-0 md:flex-1 relative overflow-hidden bg-black/80 flex items-center justify-center p-4 md:p-8">
            {isImage ? (
              <img src={selectedFileData.url} alt={selectedFileData.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            ) : (
              <video src={selectedFileData.url} controls className="max-w-full max-h-full rounded-xl shadow-2xl outline-none" />
            )}
          </div>
          {/* Sidebar */}
          <aside className="flex-1 min-h-0 md:flex-none w-full md:w-[380px] lg:w-[420px] xl:w-[460px] bg-[#1a1c1c] md:border-l border-white/10 overflow-y-auto custom-scrollbar z-20 flex flex-col">
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center pb-12 md:pb-8">
              {combinedFooter}
            </div>
          </aside>
        </div>
      );
    }

    return (
      <ViewportCanvas 
        key={selectedFileData.name}
        fileUrl={selectedFileData.url} 
        fileName={selectedFileData.name} 
        metalType="gold" 
        isReviewMode={false}
        sidebarFooter={combinedFooter}
      />
    );
  };

  return (
    <div className="flex-1 w-full h-full relative">
      {renderPreview()}
    </div>
  );
}
