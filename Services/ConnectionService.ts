
import { ConnectionType } from '../types';

class ConnectionService {
  private port: any = null;
  private writer: any = null;
  private reader: any = null;
  private socket: WebSocket | null = null;
  private bluetoothDevice: any = null;
  private bluetoothCharacteristic: any = null;

  async connectUSB() {
    try {
      // @ts-ignore
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      this.writer = this.port.writable.getWriter();
      this.startReadingUSB();
      return true;
    } catch (err) {
      console.error('USB Connection failed:', err);
      return false;
    }
  }

  private async startReadingUSB() {
    const textDecoder = new TextDecoder();
    while (this.port.readable) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          const text = textDecoder.decode(value);
          this.onDataReceived(text);
        }
      } catch (error) {
        console.error(error);
      } finally {
        this.reader.releaseLock();
      }
    }
  }

  async connectWiFi(ip: string) {
    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(`ws://${ip}:81`); // FluidNC default WebSocket
        this.socket.onopen = () => {
          console.log('WiFi Connected');
          resolve(true);
        };
        this.socket.onmessage = (event) => {
          this.onDataReceived(event.data);
        };
        this.socket.onerror = (err) => {
          console.error('WebSocket Error:', err);
          resolve(false);
        };
      } catch (err) {
        resolve(false);
      }
    });
  }

  async connectBluetooth() {
    try {
      // @ts-ignore
      this.bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] }], // Common UART service
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
      });
      const server = await this.bluetoothDevice.gatt.connect();
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
      this.bluetoothCharacteristic = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
      
      const rxChar = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
      await rxChar.startNotifications();
      rxChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const text = new TextDecoder().decode(value);
        this.onDataReceived(text);
      });
      
      return true;
    } catch (err) {
      console.error('Bluetooth error:', err);
      return false;
    }
  }

  async send(data: string) {
    console.log('Sending:', data);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data + '\n');

    if (this.writer) {
      await this.writer.write(encoded);
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data + '\n');
    } else if (this.bluetoothCharacteristic) {
      await this.bluetoothCharacteristic.writeValue(encoded);
    }
  }

  private onDataReceived(data: string) {
    // Dispatch custom event for the UI to consume
    window.dispatchEvent(new CustomEvent('cnc-data', { detail: data }));
  }

  disconnect() {
    this.writer?.releaseLock();
    this.port?.close();
    this.socket?.close();
    this.bluetoothDevice?.gatt.disconnect();
    this.writer = null;
    this.socket = null;
    this.bluetoothCharacteristic = null;
  }
}

export const cncService = new ConnectionService();
