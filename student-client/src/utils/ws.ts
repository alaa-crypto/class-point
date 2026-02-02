// student-client/src/utils/ws.ts

export class WSClient {
  private socket: WebSocket;
  private messageCallback: ((msg: any) => void) | null = null;
  private openCallback: (() => void) | null = null;
  private closeCallback: (() => void) | null = null;

  constructor(url: string) {
    console.log("🔍 WSClient: Creating WebSocket for:", url);
    this.socket = new WebSocket(url);
    console.log("🔍 WSClient: WebSocket created, setting up listeners");

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.socket.onopen = () => {
      console.log("🔌 WebSocket connected");
      if (this.openCallback) {
        console.log("🔌 Calling openCallback");
        this.openCallback();
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.messageCallback) {
          this.messageCallback(data);
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    this.socket.onclose = () => {
      console.log("🔌 WebSocket closed");
      if (this.closeCallback) this.closeCallback();
    };

    this.socket.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
    };
  }

  // FIX: Make sure these are methods, not properties
  onMessage(callback: (msg: any) => void): void {
    console.log("🔍 WSClient: onMessage method called");
    this.messageCallback = callback;
  }

  onOpen(callback: () => void): void {
    console.log("🔍 WSClient: onOpen method called");
    this.openCallback = callback;
  }

  onClose(callback: () => void): void {
    console.log("🔍 WSClient: onClose method called");
    this.closeCallback = callback;
  }

  send(data: any): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn("⚠️ WebSocket not ready, message skipped:", data);
    }
  }

  close(): void {
    this.socket.close();
  }
}