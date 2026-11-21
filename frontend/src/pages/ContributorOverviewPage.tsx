import React from 'react';
import { Plus, ArrowRight, RotateCw, Lock, Globe, Wallet } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { isArchiveOwnedBy, isArchivePrivate } from '../lib/ownership';
import { extractTransactionReceipts } from '../lib/receipts';
import { StatusBadge } from '../components/StatusBadge';
import { TransactionReceiptHistory } from '../components/TransactionReceiptHistory';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const ContributorOverviewPage: React.FC = () => {
  const {
    setActivePage,
    setSelectedArchiveId,
    archives,
    wallet,
    connectWallet,
    isSyncingArchives,
    syncArchives,
    restorationFeeEth,
  } = useArchiveStore();

  const myArchives = archives.filter((item) => isArchiveOwnedBy(item, wallet.address));
  const myReceipts = extractTransactionReceipts(myArchives);
  const waitingCount = myArchives.filter(
    (a) => a.status === 'menunggu_tinjauan' || a.status === 'perlu_koreksi'
  ).length;
  const recordedCount = myArchives.filter((a) => a.status === 'tercatat').length;
  const privateCount = myArchives.filter((a) => isArchivePrivate(a)).length;

  const steps = [
    {
      num: '1',
      title: 'Unggah foto berizin & pilih visibilitas',
      desc: 'Tentukan apakah foto ditampilkan di galeri publik atau disimpan sebagai kenangan pribadi (privat).',
    },
    {
      num: '2',
      title: 'Tinjauan izin & kategori oleh kurator',
      desc: 'Model CNN memberi saran kategori; kurator memverifikasi izin sebelum menerbitkan token.',
    },
    {
      num: '3',
      title: 'Pencatatan ERC-721 & bukti transaksi privat',
      desc: 'Token ID, IPFS CID, dan Tx Hash minting hanya dibuka untuk pemilik token & kurator.',
    },
    {
      num: '4',
      title: 'Restorasi AI Real-ESRGAN x4 (opsional)',
      desc: `Setelah token asli aktif on-chain, ajukan restorasi berbayar (${
        restorationFeeEth || '0.01'
      } ETH) sebagai versi turunan terpisah.`,
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="space-y-4">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · DASHBOARD PEMOHON
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Kelola pengajuan foto, atur visibilitas arsip, dan pantau bukti transaksi on-chain milik Anda.
        </h1>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setActivePage('unggah')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-forest hover:bg-forest-hover text-surface text-sm font-semibold shadow-subtle transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah foto baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePage('pemohon')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-sm font-semibold transition-colors min-h-[44px]"
          >
            <span>Arsip &amp; bukti transaksi</span>
            <ArrowRight className="w-4 h-4 text-ink-muted" />
          </button>
          <button
            type="button"
            onClick={() => void syncArchives()}
            disabled={isSyncingArchives}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-btn bg-paper hover:bg-surface border border-border text-ink text-xs font-mono transition-colors min-h-[44px]"
          >
            <RotateCw className={`w-3.5 h-3.5 text-forest ${isSyncingArchives ? 'animate-spin' : ''}`} />
            <span>{isSyncingArchives ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-card p-6 shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">Total pengajuan</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">{myArchives.length}</p>
          <p className="text-xs font-mono text-ink-muted mt-2">Terkait wallet aktif</p>
        </div>

        <div className="bg-surface border border-border rounded-card p-6 shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">Menunggu kurasi</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">{waitingCount}</p>
          <p className="text-xs font-mono text-status-warning mt-2">Dalam antrean kurator</p>
        </div>

        <div className="bg-surface border border-border rounded-card p-6 shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">Tercatat on-chain</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">{recordedCount}</p>
          <p className="text-xs font-mono text-forest mt-2">{wallet.chainName}</p>
        </div>

        <div className="bg-surface border border-border rounded-card p-6 shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">Arsip privat</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">{privateCount}</p>
          <p className="text-xs font-mono text-ink-muted mt-2">Disembunyikan dari publik</p>
        </div>
      </div>

      {/* Alur Kerja Pemohon */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Alur pengajuan pemohon</h2>
          <span className="text-xs font-mono text-ink-muted">4 tahap utama</span>
        </div>
        <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
          {steps.map((step) => (
            <div key={step.num} className="flex items-start gap-4">
              <span className="w-7 h-7 rounded-full bg-paper border border-border flex items-center justify-center text-xs font-mono font-semibold text-ink flex-shrink-0 mt-0.5">
                {step.num}
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="text-xs text-ink-muted leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pengajuan Terbaru */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Pengajuan terbaru Anda</h2>
          <span className="text-xs font-mono text-ink-muted">{myArchives.length} arsip milik akun ini</span>
        </div>

        {!wallet.isConnected ? (
          <div className="bg-surface border border-border rounded-card p-10 text-center space-y-4 shadow-subtle">
            <div className="w-11 h-11 rounded-full bg-forest/10 text-forest flex items-center justify-center mx-auto">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-ink-muted max-w-md mx-auto">
              Hubungkan MetaMask untuk memuat pengajuan foto, mengatur status privat/publik, dan membuka bukti transaksi resmi Anda.
            </p>
            <button
              type="button"
              onClick={() => void connectWallet()}
              className="px-5 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle"
            >
              Hubungkan MetaMask
            </button>
          </div>
        ) : myArchives.length === 0 ? (
          <div className="bg-surface border border-border rounded-card p-10 text-center space-y-3 shadow-subtle">
            <p className="text-xs font-mono text-ink-muted">
              Belum ada pengajuan arsip foto dari alamat wallet ini pada jaringan {wallet.chainName}.
            </p>
            <button
              type="button"
              onClick={() => setActivePage('unggah')}
              className="px-4 py-2 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-semibold"
            >
              Mulai Unggah Foto Pertama
            </button>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-card overflow-x-auto shadow-subtle">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-paper/50 text-[11px] font-mono text-ink-muted uppercase">
                <tr>
                  <th className="py-3 px-4 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">Judul &amp; Kategori</th>
                  <th className="py-3 px-4 font-medium">Visibilitas</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Token</th>
                  <th className="py-3 px-4 font-medium">Pembaruan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 text-xs">
                {myArchives.map((item) => {
                  const v0 = item.versions.find((v) => v.versionType === 'original') || item.versions[0];
                  const isPriv = isArchivePrivate(item);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedArchiveId(item.id);
                        setActivePage('detail');
                      }}
                      className="hover:bg-paper/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-forest">{item.id}</td>
                      <td className="py-3 px-4 text-ink font-medium">
                        {item.title} · <span className="capitalize text-ink-muted">{item.finalCategory}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-btn text-[11px] font-mono ${
                            isPriv
                              ? 'bg-ink text-surface'
                              : 'bg-paper border border-border text-ink-muted'
                          }`}
                        >
                          {isPriv ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                          <span>{isPriv ? 'Privat' : 'Publik'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4 font-mono text-ink">
                        {v0?.onChainTokenId ? `#${v0.onChainTokenId}` : '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-muted">{item.updatedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {wallet.isConnected && (
        <TransactionReceiptHistory
          receipts={myReceipts}
          chainId={wallet.chainId}
          defaultLimit={5}
          title="Riwayat bukti transaksi Anda"
          subtitle="Mencakup minting token asli, pembayaran restorasi AI, dan minting versi turunan SR x4."
          onSelectArchive={(id) => {
            setSelectedArchiveId(id);
            setActivePage('detail');
          }}
        />
      )}

      <FooterDisclaimer />
    </div>
  );
};

export default ContributorOverviewPage;
