import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { BillboardLocation } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  billboard: BillboardLocation | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  billboard,
}) => {
  if (!isOpen || !billboard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-white">Hapus Titik Billboard?</h3>
          <p className="text-xs text-slate-400 mt-1">
            Anda akan menghapus data titik reklame ini dari sistem dan database secara permanen.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400">{billboard.code}</span>
            <span className="text-slate-200 font-semibold truncate">{billboard.name}</span>
          </div>
          <div className="text-slate-400 text-[11px] truncate">{billboard.address}</div>
          <div className="text-[10px] text-slate-500 pt-1 flex items-center gap-2">
            <span>Tipe: {billboard.type}</span>
            <span>•</span>
            <span>Status: {billboard.status}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            Peta interaktif, stream telemetri sensor, dan kalkulasi CRM akan otomatis disinkronkan setelah titik ini dihapus.
          </span>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Ya, Hapus Titik Ini</span>
          </button>
        </div>
      </div>
    </div>
  );
};
