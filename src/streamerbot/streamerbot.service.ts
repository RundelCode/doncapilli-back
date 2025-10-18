import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StreamerbotClient } from '@streamerbot/client';

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

@Injectable()
export class StreamerbotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamerbotService.name);
  private client: StreamerbotClient;

  // Salud
  private connected = false;
  private lastEventAt: Date | null = null;
  private lastConnectInfo: { name?: string; version?: string } | null = null;

  // Evitar duplicar handlers tras reconectar
  private handlersBound = false;

  constructor() {
    // === Config (.env) ===
    const host = process.env.STREAMERBOT_HOST ?? '127.0.0.1'; // <— SIN "ws://"
    const port = Number(process.env.STREAMERBOT_PORT ?? 8080);
    const endpointRaw = process.env.STREAMERBOT_ENDPOINT ?? '/';
    const endpoint = endpointRaw.startsWith('/') ? endpointRaw : `/${endpointRaw}`;
    const password = process.env.STREAMERBOT_PASSWORD || undefined;

    this.logger.log(
      `Streamer.bot → ws://${host}:${port}${endpoint} (pwd: ${password ? 'sí' : 'no'})`,
    );

    this.client = new StreamerbotClient({
      host,           // <— host simple, SIN esquema
      port,
      endpoint,
      password,

      // Mantén lo que ya funcionaba
      subscribe: { Twitch: ['ChatMessage'] },

      onConnect: (info) => {
        this.connected = true;
        this.lastConnectInfo = { name: info?.name, version: info?.version };
        this.logger.log(`✅ Conectado a Streamer.bot: ${info?.name} v${info?.version}`);

        // (Opcional, para depurar TODO Twitch): intenta añadir wildcard sin romper tipos
        // Si tu build no soporta '*', esto fallará silenciosamente y sigues con ChatMessage
        Promise.resolve(
          // forzamos el tipo para saltarnos el error TS2322
          (this.client as any).subscribe?.({ Twitch: ['*'] as any }),
        ).catch(() => {
          // no hacemos ruido si no se puede; sigues con ChatMessage
        });

        this.bindEventHandlersOnce();
      },

      onDisconnect: () => {
        this.connected = false;
        this.logger.warn('⚠️ Cliente desconectado de Streamer.bot');
      },

      onError: (err) => {
        this.logger.error(`❌ WS error: ${err?.message}`);
      },
    });
  }

  async onModuleInit() {
    // No await para que no caiga el arranque si el WS tarda.
    this.client.connect().catch((e: any) => {
      this.logger.error(`❌ No se pudo abrir WS (reintenta si está activo): ${e?.message}`);
    });
  }

  onModuleDestroy() {
    try {
      this.client.disconnect();
    } catch {}
  }

  private bindEventHandlersOnce() {
    if (this.handlersBound) return;
    this.handlersBound = true;

    // Si el wildcard fue aceptado por el server, esto recibirá *cualquier* evento Twitch
    // Firma de handler para 'Twitch.*' es de un solo parámetro
    this.client.on('Twitch.*' as any, (_payload: any) => {
      this.lastEventAt = new Date();
      this.logger.debug('🔔 Twitch.* event recibido');
    });

    // Handler específico que ya tenías (ChatMessage)
    this.client.on('Twitch.ChatMessage', (data: any) => {
      this.lastEventAt = new Date();

      const chat: ChatMsg = {
        platform: 'twitch',
        channel:
          data?.channel?.name ??
          data?.broadcaster?.login ??
          data?.broadcaster?.name ??
          'unknown',
        user: {
          id: data?.user?.id ?? data?.chatter?.id,
          name: data?.user?.login ?? data?.chatter?.login,
          displayName: data?.user?.displayName ?? data?.chatter?.displayName,
          isMod: data?.user?.isMod ?? data?.tags?.mod === true,
          isSub: data?.user?.isSubscriber ?? data?.tags?.subscriber === true,
        },
        message: {
          id: data?.message?.id ?? data?.id,
          text: (data?.message?.text ?? data?.message ?? '').toString(),
        },
        raw: data,
      };

      this.logger.debug(`[${chat.channel}] <${chat.user.displayName}> ${chat.message.text}`);

      this.handleCommands(chat).catch((e) =>
        this.logger.error(`Command handler error: ${e?.message}`),
      );
    });

    this.logger.log('📡 Handlers de Streamer.bot registrados.');
  }

  private async handleCommands(chat: ChatMsg) {
    const text = chat.message.text?.trim();
    if (!text || !text.startsWith('!')) return;

    const [cmd, ...args] = text.slice(1).split(/\s+/);

    switch ((cmd || '').toLowerCase()) {
      case 'r': {
        const contenido = args.join(' ');
        this.logger.log(`📝 !R de ${chat.user.displayName}: ${contenido}`);
        break;
      }
      case 'ping': {
        this.logger.log(`🏓 !ping de ${chat.user.displayName}`);
        break;
      }
      default:
        break;
    }
  }

  public getHealth() {
    return {
      connected: this.connected,
      streamerbot: this.lastConnectInfo ?? {},
      lastEventAt: this.lastEventAt ? this.lastEventAt.toISOString() : null,
      subscriptions: { Twitch: ['ChatMessage', '(wildcard if supported)'] },
    };
  }
}
