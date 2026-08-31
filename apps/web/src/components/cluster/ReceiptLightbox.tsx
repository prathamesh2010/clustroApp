import React from 'react';
import { X, Download } from 'lucide-react';

interface ReceiptLightboxProps {
  imageUrl: string;
  fileName: string;
  onClose: () => void;
}

export const ReceiptLightbox: React.FC<ReceiptLightboxProps> = ({ imageUrl, fileName, onClose }) => {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-2xl max-h-[85vh] bg-stone-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-3.5 bg-stone-950 text-white shrink-0">
          <span className="text-xs font-semibold truncate max-w-xs">{fileName}</span>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-full hover:bg-stone-800 text-stone-300 transition-colors"
              title="Open full size"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-800 text-stone-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-2 overflow-auto flex items-center justify-center bg-black/40">
          <img src={imageUrl} alt={fileName} className="max-h-[75vh] w-auto object-contain rounded-xl" />
        </div>
      </div>
    </div>
  );
};
