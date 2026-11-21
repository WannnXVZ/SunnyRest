import { describe, expect, it } from 'vitest';
import { Interface, parseEther } from 'ethers';
import ArsipFotoVersiABI from '../abi/ArsipFotoVersi.json';
import { NETWORKS, DEFAULT_CHAIN_ID } from '../config/networks';
import { truncateIdentifier } from '../lib/hash';
import {
  normalizeBytes32Hash,
  normalizeHexHash,
  parseContractError,
} from '../lib/contract';
import { IPFS_GATEWAY, resolveIpfsUrl } from '../lib/ipfs';
import { isArchiveOwnedBy, isArchivePrivate } from '../lib/ownership';
import { extractTransactionReceipts, parseArchiveTimestamp } from '../lib/receipts';
import { ArchiveItem } from '../types';

describe('Utilitas Hash, IPFS URL, Konfigurasi Jaringan & Parser Error Kontrak', () => {
  it('truncateIdentifier memotong hash panjang dan mempertahankan hash pendek', () => {
    const full = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateIdentifier(full, 6, 4)).toBe('0x1234...5678');
    expect(truncateIdentifier('0x1234', 6, 4)).toBe('0x1234');
  });

  it('normalizeHexHash dan normalizeBytes32Hash menormalkan SHA-256 secara konsisten', () => {
    const rawHex = '4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a';
    expect(normalizeHexHash(`0x${rawHex.toUpperCase()}`)).toBe(rawHex);
    expect(normalizeBytes32Hash(rawHex)).toBe(`0x${rawHex}`);
    expect(normalizeBytes32Hash(`0x${rawHex.toUpperCase()}`)).toBe(`0x${rawHex}`);
  });

  it('resolveIpfsUrl mengonversi URI ipfs:// dan CID mentah menjadi URL gateway serta mempertahankan URL HTTP/relatif', () => {
    expect(resolveIpfsUrl('ipfs://bafybeitest123')).toBe(`${IPFS_GATEWAY}bafybeitest123`);
    expect(resolveIpfsUrl('bafybeitest123')).toBe(`${IPFS_GATEWAY}bafybeitest123`);
    expect(resolveIpfsUrl('/storage/files/abc.png')).toBe('/storage/files/abc.png');
    expect(resolveIpfsUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('parseContractError menerjemahkan penolakan MetaMask, saldo kurang, dan custom error Solidity', () => {
    expect(parseContractError({ code: 4001 })).toContain('dibatalkan oleh pengguna');
    expect(parseContractError({ code: 'INSUFFICIENT_FUNDS' })).toContain('Saldo ETH tidak mencukupi');

    const iface = new Interface(ArsipFotoVersiABI);
    const biayaErrData = iface.encodeErrorResult('BiayaTidakTepat', [
      parseEther('0.005'),
      parseEther('0.01'),
    ]);
    const msgBiaya = parseContractError({ data: biayaErrData });
    expect(msgBiaya).toContain('0.005 ETH');
    expect(msgBiaya).toContain('0.01 ETH');

    const parentErrData = iface.encodeErrorResult('ParentTidakTerdaftar', [99n]);
    expect(parseContractError({ data: parentErrData })).toContain('#99');

    const dupErrData = iface.encodeErrorResult('HashSudahTerpakai', [
      '0x' + '11'.repeat(32),
    ]);
    expect(parseContractError({ data: dupErrData })).toContain('anti-duplikat');
  });

  it('Konfigurasi jaringan lokal memiliki alamat kontrak valid dan Sepolia tidak memakai placeholder', () => {
    expect(DEFAULT_CHAIN_ID).toBe(31337);
    expect(NETWORKS[31337].contractAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(NETWORKS[11155111].contractAddress).not.toBe('0x71C0a5e84860D4F07441995874400E7F550F8e3c');
  });

  it('isArchiveOwnedBy dan isArchivePrivate memvalidasi kepemilikan case-insensitive serta status privat', () => {
    const sampleArchive: ArchiveItem = {
      id: 'SR-0099',
      title: 'Arsip Uji Privasi',
      creator: 'Kontributor',
      source: 'Koleksi Pribadi',
      licenseInfo: 'CC BY 4.0',
      recipientAddress: '0xAbCdEf123456789012345678901234567890aBcD',
      initialCategory: 'orang',
      finalCategory: 'orang',
      status: 'tercatat',
      visibility: 'private',
      isPrivate: true,
      aiPrediction: { category: 'orang', confidence: 0.9, advisoryNote: '' },
      originalHash: 'a'.repeat(64),
      originalCid: 'bafybeitest',
      versions: [
        {
          versionNumber: 1,
          versionType: 'original',
          label: 'Original',
          parentId: null,
          ipfsCid: 'bafybeitest',
          fileHash: 'a'.repeat(64),
          ownerAddress: '0x1111222233334444555566667777888899990000',
          timestamp: '2026-11-21',
          imageUrl: '/storage/files/test.png',
        },
      ],
      createdAt: '2026-11-21',
      updatedAt: '2026-11-21',
    };

    expect(isArchiveOwnedBy(sampleArchive, '0xabcdef123456789012345678901234567890abcd')).toBe(true);
    expect(isArchiveOwnedBy(sampleArchive, '0x1111222233334444555566667777888899990000')).toBe(true);
    expect(isArchiveOwnedBy(sampleArchive, '0x9999999999999999999999999999999999999999')).toBe(false);
    expect(isArchiveOwnedBy(sampleArchive, null)).toBe(false);

    expect(isArchivePrivate(sampleArchive)).toBe(true);
    expect(isArchivePrivate({ ...sampleArchive, visibility: 'public', isPrivate: false })).toBe(false);
    expect(isArchivePrivate({ ...sampleArchive, visibility: undefined, isPrivate: true })).toBe(true);
  });

  it('extractTransactionReceipts mengekstrak seluruh jenis transaksi tanpa duplikasi dan mengurutkan dari terbaru', () => {
    expect(parseArchiveTimestamp('21 Nov 2026, 09.20')).toBeGreaterThan(
      parseArchiveTimestamp('19 Nov 2026, 22.52')
    );

    const arsip1: ArchiveItem = {
      id: 'SR-0001',
      title: 'Arsip Pertama',
      creator: 'Kontributor A',
      source: 'Dokumentasi',
      licenseInfo: 'CC BY 4.0',
      initialCategory: 'orang',
      finalCategory: 'orang',
      status: 'tercatat',
      aiPrediction: { category: 'orang', confidence: 0.9, advisoryNote: '' },
      originalHash: 'a'.repeat(64),
      originalCid: 'QmA',
      versions: [
        {
          versionNumber: 1,
          versionType: 'original',
          label: 'Asli / Token #1',
          parentId: null,
          ipfsCid: 'QmA',
          fileHash: 'a'.repeat(64),
          onChainTokenId: 1,
          transactionHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
          timestamp: '18 Nov 2026, 10.00',
          imageUrl: 'ipfs://QmA',
        },
      ],
      createdAt: '18 Nov 2026',
      updatedAt: '18 Nov 2026',
    };

    const arsip2: ArchiveItem = {
      id: 'SR-0003',
      title: 'Arsip Restorasi',
      creator: 'Kontributor B',
      source: 'Kitab',
      licenseInfo: 'CC0 1.0',
      initialCategory: 'orang',
      finalCategory: 'orang',
      status: 'tercatat',
      isPrivate: true,
      visibility: 'private',
      paymentTxHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      restorationFeePaid: '0.01 ETH',
      aiPrediction: { category: 'orang', confidence: 0.95, advisoryNote: '' },
      originalHash: 'b'.repeat(64),
      originalCid: 'QmB',
      versions: [
        {
          versionNumber: 1,
          versionType: 'original',
          label: 'Asli / Token #2',
          parentId: null,
          ipfsCid: 'QmB',
          fileHash: 'b'.repeat(64),
          onChainTokenId: 2,
          transactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
          timestamp: '19 Nov 2026, 22.52',
          imageUrl: 'ipfs://QmB',
        },
        {
          versionNumber: 2,
          versionType: 'derivative',
          label: 'Super-Resolution x4 / Token #3',
          parentId: '2',
          ipfsCid: 'QmC',
          fileHash: 'c'.repeat(64),
          onChainTokenId: 3,
          requestId: 1,
          transactionHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
          timestamp: '21 Nov 2026, 09.20',
          imageUrl: 'ipfs://QmC',
        },
      ],
      createdAt: '19 Nov 2026',
      updatedAt: '21 Nov 2026',
    };

    const receipts = extractTransactionReceipts([arsip1, arsip2, arsip1]);
    expect(receipts).toHaveLength(4);
    expect(receipts[0].type).toBe('mint_derivative');
    expect(receipts[0].isPrivate).toBe(true);
    expect(receipts[1].type).toBe('restoration_payment');
    expect(receipts[1].feeLabel).toBe('0.01 ETH');
    expect(receipts[2].type).toBe('mint_original');
    expect(receipts[2].archiveId).toBe('SR-0003');
    expect(receipts[3].type).toBe('mint_original');
    expect(receipts[3].archiveId).toBe('SR-0001');
  });
});
