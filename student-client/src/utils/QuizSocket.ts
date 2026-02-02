// student-client/src/utils/QuizSocket.ts
export class QuizSocket {
  private socket: WebSocket;
  private messageHandlers: ((msg: any) => void)[] = [];
  private openHandlers: (() => void)[] = [];
  private closeHandlers: (() => void)[] = [];
  private errorHandlers: ((error: Event) => void)[] = [];

  constructor(url: string) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("🔌 QuizSocket connected");
      this.openHandlers.forEach(handler => handler());
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(data));
      } catch (err) {
        console.error("QuizSocket message parse error:", err);
      }
    };

    this.socket.onclose = (event) => {
      console.log("🔌 QuizSocket closed", event.code, event.reason);
      this.closeHandlers.forEach(handler => handler());
    };

    this.socket.onerror = (error) => {
      console.error("❌ QuizSocket error:", error);
      this.errorHandlers.forEach(handler => handler(error));
    };
  }

  onMessage(handler: (msg: any) => void) {
    this.messageHandlers.push(handler);
  }

  onOpen(handler: () => void) {
    this.openHandlers.push(handler);
  }

  onClose(handler: () => void) {
    this.closeHandlers.push(handler);
  }

  onError(handler: (error: Event) => void) {
    this.errorHandlers.push(handler);
  }

  send(data: any) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn("⚠️ QuizSocket not ready, message skipped:", data);
    }
  }

  close() {
    this.socket.close();
  }
}