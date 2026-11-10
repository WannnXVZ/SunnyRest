import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, BookOpen, ArrowUpRight } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const ArchiveGalleryPage: React.FC = () => {
  const {
    archives,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    setSelectedArchiveId,
    setActivePage,
  } = useArchiveStore();

  const [sortOrder, setSortOrder] = useState<'terbaru' | 'terlama'>('terbaru');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'orang', label: 'Orang' },
    { id: 'bangunan', label: 'Bangunan' },
    { id: 'lanskap', label: 'Lanskap' },
  ];

  const filteredArchives = archives
    .filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === 'all' || item.finalCategory === categoryFilter || item.initialCategory === categoryFilter;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortOrder === 'terbaru') {
        return b.id.localeCompare(a.id);
      }
      return a.id.localeCompare(b.id);
    });

  const handleSelectArchive = (id: string) => {
    setSelectedArchiveId(id);
    setActivePage('detail');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div className="space-y-2">
          <p className="text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
            KOLEKSI / ARSIP FOTO
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Jejak yang tetap hidup.
          </h1>
          <p className="text-sm text-ink-muted font-sans max-w-2xl leading-relaxed">
            Telusuri foto, kenali sumbernya, dan ikuti setiap versi dalam satu arsip.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => setActivePage('unggah')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-semibold shadow-subtle min-h-[42px] transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-ink" />
          <span>Unggah foto</span>
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search input with shortcut hint */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, sumber, atau ID arsip..."
            aria-label="Cari judul, sumber, atau ID arsip"
            className="w-full pl-10 pr-12 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink placeholder:text-ink-muted focus:border-forest outline-none transition-colors min-h-[42px]"
          />
          <kbd className="absolute right-3 top-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-paper border border-border text-ink-muted pointer-events-none">
            ⌘ K
          </kbd>
        </div>

        {/* Filter Pills and Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
          <div className="flex items-center gap-1.5">
            {categories.map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3.5 py-2 rounded-btn text-xs font-semibold transition-colors min-h-[38px] ${
                    isActive
                      ? 'bg-ink text-surface shadow-subtle'
                      : 'bg-surface border border-border text-ink hover:bg-paper'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'terbaru' | 'terlama')}
              aria-label="Urutkan arsip"
              className="px-3 py-2 rounded-btn bg-surface border border-border text-xs font-mono text-ink focus:border-forest outline-none cursor-pointer min-h-[38px]"
            >
              <option value="terbaru">Terbaru ˅</option>
              <option value="terlama">Terlama ˅</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subtitle / Counter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-ink-muted pt-1 border-t border-border/80">
        <span>{filteredArchives.length} arsip contoh</span>
        <span className="text-[11px]">
          Foto ilustratif, bukan bukti sejarah · Kategori final ditentukan kurator
        </span>
      </div>

      {/* 3-Column Card Grid or Empty State */}
      {filteredArchives.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-12 text-center space-y-4 shadow-subtle max-w-lg mx-auto my-6">
          <p className="text-sm font-mono text-ink-muted">
            Tidak ada arsip yang cocok dengan kata kunci pencarian atau filter yang dipilih.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
            }}
            className="px-4 py-2 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-semibold shadow-subtle transition-colors"
          >
            Reset Pencarian & Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArchives.map((item) => {
            const originalVer = item.versions.find((v) => v.versionType === 'original') || item.versions[0];
            const hasDerivative = item.versions.some((v) => v.versionType === 'derivative');
            const versionText = hasDerivative ? 'Asli + restorasi x2' : 'Versi asli';

            return (
              <div
                key={item.id}
                onClick={() => handleSelectArchive(item.id)}
                className="group bg-surface border border-border rounded-card overflow-hidden shadow-card hover:shadow-md hover:border-forest/60 transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Image Container with Category Badge */}
                <div className="relative aspect-[4/3] bg-paper overflow-hidden">
                  <img
                    src={originalVer.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover grayscale contrast-110 group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-btn bg-surface/95 backdrop-blur-sm border border-border text-[11px] font-mono font-semibold text-ink capitalize shadow-subtle">
                    {item.finalCategory}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                      <span>{item.id} / DEMO</span>
                      <span>Terdaftar · simulasi</span>
                    </div>

                    <h3 className="font-display font-bold text-base text-ink group-hover:text-forest transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-ink-muted font-sans line-clamp-1">
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-ink-muted" />
                      <span>{item.source}</span>
                    </div>

                    <p className="text-[11px] font-mono text-ink-muted">
                      Izin contoh · belum diverifikasi
                    </p>
                  </div>

                  {/* Footer Link Row */}
                  <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs font-mono text-ink-muted group-hover:text-forest transition-colors">
                    <span>{versionText}</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      <div className="pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-ink-muted">
        <span>Menampilkan 1–{filteredArchives.length} dari {filteredArchives.length} arsip contoh</span>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            disabled
            className="px-3 py-1.5 rounded-btn bg-surface border border-border text-ink-muted opacity-50 cursor-not-allowed text-xs font-sans"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-btn bg-gold text-ink font-mono font-bold text-xs flex items-center justify-center shadow-subtle"
          >
            1
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1.5 rounded-btn bg-surface border border-border text-ink-muted opacity-50 cursor-not-allowed text-xs font-sans"
          >
            Berikutnya
          </button>
        </div>
      </div>

      <FooterDisclaimer />
    </div>
  );
};
