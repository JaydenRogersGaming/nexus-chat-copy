import { useEffect } from 'react';
import { chatSettings } from 'zitejs/api';
import * as DB from '../lib/storage';

/** Keeps this device's word filter + immunity list in step with the shared one. */
export function useChatSettingsSync() {
  useEffect(() => {
    const pull = () => chatSettings({ action: 'get' }).then(r => {
      if (r.words) DB.setChatWords(r.words);
      DB.setMuteImmune(r.immune);
    }).catch(() => {});
    pull();
    const t = setInterval(pull, 60_000);
    return () => clearInterval(t);
  }, []);
}
