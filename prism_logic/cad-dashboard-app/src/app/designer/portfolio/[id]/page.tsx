"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPortfolioItem } from '@/app/actions';
import AuthGuard from '@/components/AuthGuard';

export default function PortfolioDetailPage() {
  const { id } = useParams() as { id: string };
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItem = async () => {
      setLoading(true);
      try {
        const res = await getPortfolioItem(id);
        if (res.success) {
          setItem(res.data);
        } else {
          alert('Failed to load portfolio item: ' + res.error);
        }
      } catch (err) {
        console.error('Error loading portfolio item:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadItem();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ffe30c] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
        <p className="text-sm font-bold text-gray-400">Portfolio item not found.</p>
        <Link href="/designer/profile" className="mt-4 text-[#ffe30c] text-xs font-bold uppercase hover:underline">
          Back to Profile
        </Link>
      </div>
    );
  }

  // Parse description
  const description = item.description || '';
  const categoryMatch = description.match(/\[CATEGORY\] (.*)/);
  const softwareMatch = description.match(/\[SOFTWARE\] (.*)/);
  const cadFileMatch = description.match(/\[CAD_FILE\] (.*)/);
  
  const category = categoryMatch ? categoryMatch[1] : 'N/A';
  const software = softwareMatch ? softwareMatch[1].split(', ') : [];
  const cadFile = cadFileMatch ? cadFileMatch[1] : '';
  const narrative = description.split('\n\n')[1] || description;

  const images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans antialiased pb-20">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/designer/profile" className="text-[10px] font-black text-[#ffe30c] uppercase tracking-widest flex items-center gap-1 hover:text-yellow-300 transition-colors mb-6">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Profile
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Images */}
            <div className="space-y-4">
              {Array.isArray(images) && images.length > 0 ? (
                images.map((img: any, idx: number) => (
                  <div key={idx} className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden">
                    <img src={img.url || img} alt={item.title} className="w-full h-auto object-cover" />
                  </div>
                ))
              ) : (
                <div className="bg-[#121212] border border-[#262626] rounded-xl aspect-square flex flex-col items-center justify-center text-gray-600">
                  <span className="material-symbols-outlined text-5xl mb-2">image_not_supported</span>
                  <p className="text-xs">No images available</p>
                </div>
              )}
            </div>

            {/* Right Column: Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{item.title}</h1>
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/10">
                  <span className="text-[#ffe30c] text-[10px] font-bold uppercase tracking-[0.15em]">{category}</span>
                </div>
              </div>

              <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#ffe30c] mb-2">Software Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {software.length > 0 ? (
                      software.map((sw: string, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-[#1a1a1a] rounded-lg text-xs font-semibold border border-[#262626]">{sw}</span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-600">No software listed</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#ffe30c] mb-2">Description</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{narrative}</p>
                </div>

                {cadFile && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#ffe30c] mb-2">CAD File</h3>
                    <a href={cadFile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#ffe30c] hover:bg-[#e6cc00] text-black px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                      <span className="material-symbols-outlined text-sm">download</span>
                      Download CAD File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
