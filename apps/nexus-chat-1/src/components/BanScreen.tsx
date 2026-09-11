import { Ban } from 'lucide-react';
import type { BanRecord } from '../lib/storage';

export default function BanScreen({ ban }: { ban: BanRecord }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center px-8">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-red-600 flex items-center justify-center">
            <Ban className="w-20 h-20 text-red-600" />
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-red-500">BANNED</h1>
          <p className="text-lg text-white/80">
            You have been banned by <span className="text-red-400 font-bold">{ban.bannedBy}</span>
          </p>
          <p className="text-sm text-white/40 mt-4">
            You no longer have access to this website.
          </p>
        </div>
      </div>
    </div>
  );
}
