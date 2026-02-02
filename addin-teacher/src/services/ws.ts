// addin-teacher/src/utils/ws.ts (and student-client/src/utils/ws.ts)
export class WSClient {
  private socket: WebSocket;
  private messageCallback: ((msg: any) => void) | null = null;
  private openCallback: (() => void) | null = null;
  private closeCallback: (() => void) | null = null;
  private errorCallback: ((error: Event) => void) | null = null;

  constructor(url: string) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("🔌 WebSocket connected:", url);
      if (this.openCallback) this.openCallback();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.messageCallback) this.messageCallback(data);
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    this.socket.onclose = () => {
      console.log("🔌 WebSocket closed");
      if (this.closeCallback) this.closeCallback();
    };

    this.socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      if (this.errorCallback) this.errorCallback(error);
    };
  }

  onMessage(callback: (msg: any) => void) {
    this.messageCallback = callback;
  }

  onOpen(callback: () => void) {
    this.openCallback = callback;
  }

  onClose(callback: () => void) {
    this.closeCallback = callback;
  }

  onError(callback: (error: Event) => void) {
    this.errorCallback = callback;
  }

  send(data: any) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn("⚠️ WebSocket not ready, message skipped:", data);
    }
  }

  close() {
    this.socket.close();
  }
}