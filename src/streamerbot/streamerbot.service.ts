import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';
import WebSocket from 'ws';
import { ParticipantsService } from '../participants/participants.service';

type ChatMsg = {
  platform: 'twitch';
  channel: string;
  user: {
    id?: string;
    name?: string;
    displayName?: string;
    isMod?: boolean;
    isSub?: boolean;
  };
  message: {
    id?: string;
    text: string;
  };
  raw?: any;
};

type SubmissionEvent = {
  kind: 'submission';
  username: string;
  rawAnswer: string;
  result:
    | {
        accepted: true;
        correct: boolean;
        awardedPoints: number;
        position?: number;
        totalScore: number;
        reason?: string;
      }
    | {
        accepted: false;
        reason: string;
        correct?: boolean;
        awardedPoints?: number;
        totalScore?: number;
      };
};

@Injectable()
export class StreamerbotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamerbotService.name);

  constructor(private readonly participants: ParticipantsService) {}

  // WS crudo
  private ws: WebSocket | null = null;
  private heartbeat: NodeJS.Timeout | null = null;

  // Reconexión
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly reconnectBaseMs = 1000;
  private manualClose = false;

  // Estado/Salud
  private connected = false;
  private lastEventAt: Date | null = null;
  private lastConnectInfo: { name?: string; version?: string } | null = null;

  // Memoria + SSE
  private eventsSubject = new Subject<any>(); // ChatMsg | SubmissionEvent
  public readonly events$ = this.eventsSubject.asObservable();
  private lastChat: ChatMsg | null = null;
  private recent: ChatMsg[] = [];
  private readonly recentMax = 100;
  private counters = { chatMessages: 0, commands: 0, submissions: 0 };

  // Config
  private readonly host = process.env.STREAMERBOT_HOST ?? '127.0.0.1';
  private readonly port = Number(process.env.STREAMERBOT_PORT ?? 8080);
  private readonly endpointRaw = process.env.STREAMERBOT_ENDPOINT ?? '/';
  private readonly endpoint = this.endpointRaw.startsWith('/') ? this.endpointRaw : `/${this.endpointRaw}`;
  private readonly password = process.env.STREAMERBOT_PASSWORD || '';

  onModuleInit() {
    this.logger.log(`WS → ws://${this.host}:${this.port}${this.endpoint} (pwd: ${this.password ? 'sí' : 'no'})`);
    this.open();
  }

  onModuleDestroy() {
    this.manualClose = true;
    this.stopHeartbeat();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.close(1000, 'app shutting down'); } catch {}
    }
    this.ws = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  // ---------- WS core ----------
  private open() {
    const url = `ws://${this.host}:${this.port}${this.endpoint}`;
    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.logger.log('✅ Conectado a Streamer.bot (WS abierto)');
        setTimeout(() => this.subscribeToChatMessage(), 200);
        this.startHeartbeat();
      });

      this.ws.on('message', (buf: WebSocket.RawData) => {
        let msg: any;
        try { msg = JSON.parse(buf.toString()); } catch { return; }

        if (msg?.request === 'Hello' || msg?.info?.name === 'Streamer.bot') {
          this.lastConnectInfo = {
            name: msg?.info?.name ?? 'Streamer.bot',
            version: msg?.info?.version,
          };
          return;
        }
        if (msg?.status === 'ok' && msg?.events) return;

        const evtName =
          typeof msg?.event === 'string'
            ? msg.event
            : (msg?.event?.source && msg?.event?.type)
              ? `${msg.event.source}.${msg.event.type}`
              : '';

        if (evtName) {
          this.lastEventAt = new Date();
          this.routeEvent(evtName, msg?.data);
        }
      });

      this.ws.on('error', (err) => {
        this.logger.error(`❌ WS error: ${err.message}`);
      });

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        this.logger.warn(`⚠️ WS cerrado (${code}) ${reason?.toString?.() ?? ''}`);
        this.stopHeartbeat();
        if (this.manualClose) return;
        this.scheduleReconnect();
      });
    } catch (e: any) {
      this.logger.error(`❌ No se pudo abrir WS: ${e.message}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(this.reconnectBaseMs * Math.pow(2, this.reconnectAttempts++), 15000);
    this.logger.warn(`⏳ Reintentando en ${Math.round(delay / 1000)}s (intento ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try {
        this.ws.send(JSON.stringify({ request: 'GetInfo', id: 'ping' }));
      } catch {}
    }, 15000);
  }
  private stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }
  // -----------------------------

  private subscribeToChatMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const sub: any = { request: 'Subscribe', id: 'sub-1', events: { Twitch: ['ChatMessage'] } };
    if (this.password) sub.password = this.password;

    try {
      this.ws.send(JSON.stringify(sub));
      this.logger.log('📨 Subscribe enviado: Twitch.ChatMessage');
    } catch (e: any) {
      this.logger.error(`No pude enviar Subscribe: ${e.message}`);
    }
  }

  private routeEvent(evtName: string, data: any) {
    switch (evtName) {
      case 'Twitch.ChatMessage':
        this.handleChatMessage(data);
        break;
      default:
        break;
    }
  }

  private handleChatMessage(data: any) {
    this.counters.chatMessages++;

    const text =
      data?.text ??
      data?.message?.message ??
      data?.message?.text ??
      '';

    const channel =
      data?.message?.channel ??
      data?.channel?.name ??
      data?.broadcaster?.login ??
      'unknown';

    const displayName =
      data?.user?.name ??
      data?.message?.displayName ??
      data?.user?.displayName ??
      data?.user?.login ??
      'user';

    const id = data?.messageId ?? data?.message?.msgId ?? data?.message?.id;

    const chat: ChatMsg = {
      platform: 'twitch',
      channel,
      user: {
        id: data?.user?.id,
        name: data?.user?.login ?? data?.user?.name,
        displayName,
        isMod: data?.user?.role === 4 || data?.tags?.mod === true,
        isSub: data?.user?.subscribed ?? data?.tags?.subscriber === true,
      },
      message: { id, text: String(text ?? '') },
      raw: data,
    };

    // Guarda para endpoints/SSE
    this.lastChat = chat;
    this.recent.push(chat);
    if (this.recent.length > this.recentMax) this.recent.shift();
    this.eventsSubject.next(chat);

    // ---- Router de comandos ----
    const t = chat.message.text.trim();
    if (!t.startsWith('!')) return;
    this.counters.commands++;

    // !R <respuesta>  (acepta comillas o sin comillas)
    const m = t.match(/^!r\s+(.+)$/i);
    if (m) {
      const rawAnswer = this.cleanQuoted(m[1]);
      const username = chat.user.name || chat.user.displayName || 'anon';

      this.submitTrivia(username, rawAnswer).catch((e) =>
        this.eventsSubject.next({
          kind: 'submission',
          username,
          rawAnswer,
          result: { accepted: false, reason: `ERROR:${e?.message ?? 'unknown'}` },
        } as SubmissionEvent),
      );
    }
  }

  private cleanQuoted(s: string) {
    // quita comillas " ' o tipográficas al inicio/fin
    return (s ?? '').trim().replace(/^["'“”]+|["'“”]+$/g, '').trim();
  }

  private async submitTrivia(username: string, rawAnswer: string) {
    this.counters.submissions++;
    const result = await this.participants.submitAnswer({ username, rawAnswer });
    const evt: SubmissionEvent = { kind: 'submission', username, rawAnswer, result: result as any };
    this.eventsSubject.next(evt);
  }

  // ========= API pública =========
  public getHealth() {
    return {
      connected: this.connected,
      streamerbot: this.lastConnectInfo ?? {},
      lastEventAt: this.lastEventAt ? this.lastEventAt.toISOString() : null,
      subscriptions: { Twitch: ['ChatMessage'] },
      counters: this.counters,
    };
  }

  public getLastChat(): ChatMsg | null {
    return this.lastChat;
  }

  public getRecent(limit = 20): ChatMsg[] {
    const n = Math.max(1, Math.min(limit, this.recentMax));
    return this.recent.slice(-n);
  }

  public getStats() {
    return {
      connected: this.connected,
      lastEventAt: this.lastEventAt ? this.lastEventAt.toISOString() : null,
      totals: { ...this.counters },
      buffer: { size: this.recent.length, max: this.recentMax },
    };
  }

  // Simulador (si usas POST /streamerbot/_simulate)
  public simulateIncoming(text: string, displayName = 'Tester') {
    const chat: ChatMsg = {
      platform: 'twitch',
      channel: 'simulated',
      user: { displayName },
      message: { text, id: undefined },
      raw: { simulated: true },
    };
    this.lastEventAt = new Date();
    this.counters.chatMessages++;
    if (text?.trim().startsWith('!')) this.counters.commands++;
    this.lastChat = chat;
    this.recent.push(chat);
    if (this.recent.length > this.recentMax) this.recent.shift();
    this.eventsSubject.next(chat);
    return chat;
  }
}
