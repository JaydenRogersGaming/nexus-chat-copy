import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { videoRooms } from 'zitejs/api';

export type Remote = { peerId: string; name: string; stream: MediaStream | null; state: RTCPeerConnectionState | 'new' };
export type ConnStatus = 'connecting' | 'connected' | 'reconnecting' | 'ended';
type Ice = { urls: string | string[]; username?: string; credential?: string };
type Out = { to: string; kind: string; payload: string };

const POLL_MS = 1500;

export function useVideoRoom(code: string, name: string, local: MediaStream | null, iceServers: Ice[], onEnded: (reason: string) => void) {
  const myId = useRef(crypto.randomUUID()).current;
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const outbox = useRef<Out[]>([]);
  const seq = useRef(0);
  const known = useRef(new Map<string, string>());
  const failures = useRef(0);
  const [remotes, setRemotes] = useState<Record<string, Remote>>({});
  const [status, setStatus] = useState<ConnStatus>('connecting');

  const send = (to: string, kind: string, data: unknown) =>
    outbox.current.push({ to, kind, payload: JSON.stringify({ seq: seq.current++, data }) });

  const patch = (id: string, p: Partial<Remote>) =>
    setRemotes(r => {
      const base: Remote = r[id] ?? { peerId: id, name: known.current.get(id) || 'Guest', stream: null, state: 'new' };
      return { ...r, [id]: { ...base, ...p } };
    });

  const drop = useCallback((id: string) => {
    pcs.current.get(id)?.close();
    pcs.current.delete(id); pendingIce.current.delete(id);
    setRemotes(r => { const n = { ...r }; delete n[id]; return n; });
  }, []);

  const makePc = useCallback((id: string) => {
    pcs.current.get(id)?.close();
    const pc = new RTCPeerConnection({ iceServers });
    local?.getTracks().forEach(t => pc.addTrack(t, local));
    pc.onicecandidate = e => { if (e.candidate) send(id, 'ice', e.candidate.toJSON()); };
    pc.ontrack = e => patch(id, { stream: e.streams[0] ?? new MediaStream([e.track]) });
    pc.onconnectionstatechange = () => {
      patch(id, { state: pc.connectionState });
      if (pc.connectionState === 'failed' && myId < id) void offer(id, true);
    };
    pcs.current.set(id, pc);
    patch(id, { state: 'new' });
    return pc;
  }, [iceServers, local]); // eslint-disable-line react-hooks/exhaustive-deps

  async function offer(id: string, restart = false) {
    const pc = restart && pcs.current.get(id) ? pcs.current.get(id)! : makePc(id);
    const o = await pc.createOffer({ iceRestart: restart });
    await pc.setLocalDescription(o);
    send(id, 'offer', pc.localDescription);
  }

  async function flushIce(id: string, pc: RTCPeerConnection) {
    for (const c of pendingIce.current.get(id) || []) await pc.addIceCandidate(c).catch(() => {});
    pendingIce.current.delete(id);
  }

  async function handle(from: string, kind: string, data: unknown) {
    if (kind === 'offer') {
      const pc = pcs.current.get(from) ?? makePc(from);
      await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
      await flushIce(from, pc);
      await pc.setLocalDescription(await pc.createAnswer());
      send(from, 'answer', pc.localDescription);
    } else if (kind === 'answer') {
      const pc = pcs.current.get(from);
      if (pc && pc.signalingState === 'have-local-offer') { await pc.setRemoteDescription(data as RTCSessionDescriptionInit); await flushIce(from, pc); }
    } else if (kind === 'ice') {
      const pc = pcs.current.get(from);
      if (pc?.remoteDescription) await pc.addIceCandidate(data as RTCIceCandidateInit).catch(() => {});
      else pendingIce.current.set(from, [...(pendingIce.current.get(from) || []), data as RTCIceCandidateInit]);
    }
  }

  useEffect(() => {
    if (!local) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const outgoing = outbox.current.splice(0);
      try {
        const r = await videoRooms({ action: 'sync', code, peerId: myId, displayName: name, outgoing });
        if (!alive) return;
        failures.current = 0;
        setStatus('connected');
        const ids = new Set(r.participants.map(p => p.peerId));
        for (const p of r.participants) {
          if (!known.current.has(p.peerId)) {
            known.current.set(p.peerId, p.displayName);
            toast(`${p.displayName} joined`);
            if (myId < p.peerId) await offer(p.peerId); else patch(p.peerId, {});
          }
        }
        for (const [id, n] of [...known.current]) {
          if (!ids.has(id)) { known.current.delete(id); drop(id); toast(`${n} left`); }
        }
        const sorted = r.signals
          .map(s => ({ from: s.from, kind: s.kind, ...(JSON.parse(s.payload) as { seq: number; data: unknown }) }))
          .sort((a, b) => a.seq - b.seq);
        for (const s of sorted) await handle(s.from, s.kind, s.data).catch(err => console.warn('signal', err));
      } catch (e) {
        outbox.current.unshift(...outgoing);
        const msg = (e as { userFacingMessage?: string })?.userFacingMessage || '';
        if (/expired|doesn't exist/i.test(msg)) { setStatus('ended'); onEnded(msg); return; }
        failures.current++;
        if (alive) setStatus('reconnecting');
      }
      if (alive) timer = setTimeout(tick, failures.current ? Math.min(POLL_MS * 2 ** failures.current, 10000) : POLL_MS);
    };
    tick();

    const bye = () => { void videoRooms({ action: 'leave', code, peerId: myId }).catch(() => {}); };
    window.addEventListener('beforeunload', bye);
    return () => {
      alive = false; clearTimeout(timer);
      window.removeEventListener('beforeunload', bye);
      pcs.current.forEach(pc => pc.close()); pcs.current.clear();
      known.current.clear(); setRemotes({});
      bye();
    };
  }, [code, local]); // eslint-disable-line react-hooks/exhaustive-deps

  return { remotes: Object.values(remotes), status };
}
