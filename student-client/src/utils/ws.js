// Simple WS wrapper with auto-reconnect
export class WSClient {
  constructor(url) {
    this.url = url;
    this.connect();
    this.listeners = [];
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.listeners.forEach((cb) => cb(data));
    };

    this.socket.onclose = () => {
      console.log('WebSocket closed, reconnecting in 3s...');
      setTimeout(() => this.connect(), 3000);
    };
  }

  send(data) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('WS not open, cannot send', data);
    }
  }

  onMessage(callback) {
    this.listeners.push(callback);
  }
}