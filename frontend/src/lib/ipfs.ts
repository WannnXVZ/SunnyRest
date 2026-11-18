const IPFS_API_URL = import.meta.env.VITE_IPFS_API_URL || '';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';
export const IPFS_GATEWAY =
  import.meta.env.VITE_IPFS_GATEWAY || 'http://127.0.0.1:8080/ipfs/';

export interface IpfsUploadResult {
  metadataUri: string;
  cid: string;
  pinned: boolean;
  strategy: 'pinata' | 'local-kubo' | 'draft-uri';
}

export async function uploadMetadataToIpfs(
  metadata: Record<string, unknown>,
  fallbackSeed: string
): Promise<IpfsUploadResult> {
  const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json',
  });

  // 1. Prioritas Pinata JWT jika dikonfigurasi
  if (PINATA_JWT) {
    const formData = new FormData();
    formData.append('file', jsonBlob, 'metadata.json');
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      const cid = data.IpfsHash as string;
      return {
        cid,
        metadataUri: `ipfs://${cid}`,
        pinned: true,
        strategy: 'pinata',
      };
    }
  }

  // 2. Node IPFS lokal (Kubo HTTP API /api/v0/add) jika aktif
  if (IPFS_API_URL) {
    try {
      const formData = new FormData();
      formData.append('file', jsonBlob, 'metadata.json');
      const res = await fetch(`${IPFS_API_URL}/api/v0/add?pin=true`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const cid = data.Hash as string;
        return {
          cid,
          metadataUri: `ipfs://${cid}`,
          pinned: true,
          strategy: 'local-kubo',
        };
      }
    } catch {
      // Fallback ke draft URI lokal bila node IPFS tidak berjalan
    }
  }

  // 3. Fallback jujur bila node IPFS tidak dijalankan saat uji kontrak lokal
  const shortHash = fallbackSeed.replace(/^0x/i, '').slice(0, 32);
  const draftCid = `bafybeidraft${shortHash}`;
  return {
    cid: draftCid,
    metadataUri: `ipfs://${draftCid}/metadata.json`,
    pinned: false,
    strategy: 'draft-uri',
  };
}
