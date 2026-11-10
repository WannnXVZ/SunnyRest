import React from 'react';
import { Search, Filter, Eye } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { StatusBadge } from '../components/StatusBadge';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const ArchiveGalleryPage: React.FC = () => {
  const {
    archives,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    setSelectedArchiveId,
    setActivePage,
  } = useArchiveStore();

  const filteredArchives = archives.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || item.finalCategory === categoryFilter || item.initialCategory === categoryFilter;

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-4">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · ARSIP FOTO BERIZIN
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Daftar seluruh catatan foto dan versi. Galeri publik hanya menampilkan versi yang sudah disetujui dan tercatat sesuai aturan produk.
        </h1>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID arsip, judul, atau sumber..."
              aria-label="Pencarian arsip foto"
              className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink placeholder:text-ink-muted focus:border-forest outline-none transition-colors min-h-[44px]"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter berdasarkan kategori"
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[44px]"
            >
              <option value="all">Semua kategori</option>
              <option value="orang">Orang</option>
              <option value="bangunan">Bangunan</option>
              <option value="lanskap">Lanskap</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter berdasarkan status"
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[44px]"
            >
              <option value="all">Semua status</option>
              <option value="tercatat">Tercatat</option>
              <option value="menunggu_tinjauan">Menunggu tinjauan</option>
              <option value="disetujui">Disetujui</option>
              <option value="belum_diterbitkan">Belum diterbitkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {filteredArchives.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-12 text-center space-y-3 shadow-subtle">
          <Filter className="w-8 h-8 text-ink-muted mx-auto" />
          <p className="text-base font-semibold text-ink">Tidak ada foto yang cocok dengan pencarian.</p>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter kategori dan status di atas.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-btn bg-paper border border-border text-xs font-semibold text-ink hover:border-forest"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredArchives.map((item) => {
            const displayImage = item.versions[0]?.imageUrl || '';
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedArchiveId(item.id);
                  setActivePage('detail');
                }}
                className="bg-surface border border-border rounded-card overflow-hidden shadow-subtle hover:border-forest transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Photo container */}
                  <div className="relative h-48 bg-paper overflow-hidden">
                    <img
                      src={displayImage}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-btn bg-surface/90 backdrop-blur-sm text-[10px] font-mono font-semibold uppercase tracking-wider text-ink">
                      {item.finalCategory}
                    </span>
                  </div>

                  {/* Body info */}
                  <div className="p-5 space-y-2">
                    <h2 className="text-base font-display font-semibold text-ink group-hover:text-forest transition-colors line-clamp-1">
                      {item.title}
                    </h2>
                    <p className="text-xs font-mono text-ink-muted">
                      {item.id} · {item.versions.length} versi
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between">
                  <StatusBadge status={item.status} isDemo />
                  <span className="text-xs font-medium text-forest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Lihat detail</span>
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Indeks Catatan (Table) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Indeks catatan</h2>
          <span className="text-xs font-mono text-ink-muted">Versi lama tidak ditimpa</span>
        </div>
        <div className="bg-surface border border-border rounded-card overflow-x-auto shadow-subtle">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-paper/50 text-[11px] font-mono text-ink-muted uppercase">
              <tr>
                <th className="py-3 px-4 font-medium">ID ARSIP</th>
                <th className="py-3 px-4 font-medium">KATEGORI FINAL</th>
                <th className="py-3 px-4 font-medium">VERSI</th>
                <th className="py-3 px-4 font-medium">STATUS KURATOR</th>
                <th className="py-3 px-4 font-medium">STATUS ON-CHAIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 text-xs">
              {archives.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    setSelectedArchiveId(item.id);
                    setActivePage('detail');
                  }}
                  className="hover:bg-paper/40 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono font-medium text-forest">{item.id}</td>
                  <td className="py-3 px-4 text-ink capitalize">{item.finalCategory}</td>
                  <td className="py-3 px-4 font-mono text-ink">{item.versions.length}</td>
                  <td className="py-3 px-4 text-ink-muted capitalize">
                    {item.status === 'tercatat' || item.status === 'disetujui' ? 'Disetujui' : 'Menunggu tinjauan'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} isDemo />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <FooterDisclaimer />
    </div>
  );
};

