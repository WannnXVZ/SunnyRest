import React from 'react';

export const FooterDisclaimer: React.FC = () => {
  return (
    <footer className="mt-12 pt-6 pb-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted font-mono leading-relaxed">
      <span>SunnyRest / Arsip dengan jejak yang dapat ditelusuri.</span>
      <span>ERC-721 membuktikan kepemilikan token, bukan hak cipta.</span>
    </footer>
  );
};

