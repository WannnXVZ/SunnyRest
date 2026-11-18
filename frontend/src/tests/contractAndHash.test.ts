import { describe, expect, it } from 'vitest';
import { Interface, parseEther } from 'ethers';
import ArsipFotoVersiABI from '../abi/ArsipFotoVersi.json';
import { NETWORKS, DEFAULT_CHAIN_ID } from '../config/networks';
import { truncateIdentifier } from '../lib/hash';
import { normalizeBytes32Hash, parseContractError } from '../lib/contract';

describe('Utilitas Hash, Konfigurasi Jaringan & Parser Error Kontrak', () => {
  it('truncateIdentifier memotong hash panjang dan mempertahankan hash pendek', () => {
    const full = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateIdentifier(full, 6, 4)).toBe('0x1234...5678');
    expect(truncateIdentifier('0x1234', 6, 4)).toBe('0x1234');
  });

  it('normalizeBytes32Hash menormalkan hex SHA-256 64 karakter ke bytes32', () => {
    const rawHex = '4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a';
    expect(normalizeBytes32Hash(rawHex)).toBe(`0x${rawHex}`);
    expect(normalizeBytes32Hash(`0x${rawHex.toUpperCase()}`)).toBe(`0x${rawHex}`);
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
});
