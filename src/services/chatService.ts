import { io, Socket } from 'socket.io-client';
import { getActiveMarketplaceSession } from '../utils/marketplaceAuth.js';
import { Message } from '../types/chat.js';

class ChatService {
  private socket: Socket | null = null;
  private messageCallback: ((msg: Message | any) => void) | null = null;

  public connect(serverUrl: string): Socket | null {
    const session = getActiveMarketplaceSession();
    if (!session) {
      this.disconnect();
      return null;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(serverUrl, {
      auth: {
        email: session.email,
        role: session.role,
        token: session.token || undefined,
      },
      transports: ['websocket', 'polling'],
    });

    if (this.messageCallback) {
      this.socket.off('receive-message');
      this.socket.on('receive-message', this.messageCallback);
    }

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public joinRoom(payload: { listingId: string; userId?: string; role?: string }): void {
    const session = getActiveMarketplaceSession();
    if (!session || !this.socket) return;

    this.socket.emit('join-room', {
      listingId: payload.listingId,
      userId: session.email,
      role: session.role,
    });
  }
  public get isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }
  public sendMessage(payload: {
    listingId: string;
    chatId?: number;
    senderId?: string;
    receiverId?: string;
    role?: string;
    content: string;
  }): void {
    const session = getActiveMarketplaceSession();
    if (!session || !this.socket) return;

    this.socket.emit('send-message', {
      ...payload,
      senderId: session.email,
      role: session.role,
    });
  }

  public onMessageReceived(cb: (msg: Message | any) => void): void {
    this.messageCallback = cb;
    if (this.socket) {
      this.socket.off('receive-message');
      this.socket.on('receive-message', cb);
    }
  }

  public offMessageReceived(): void {
    this.messageCallback = null;
    if (this.socket) {
      this.socket.off('receive-message');
    }
  }
}

const chatService = new ChatService();
export default chatService;