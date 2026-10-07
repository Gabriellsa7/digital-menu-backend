import { trace } from '@opentelemetry/api';
import { Server as SocketServer } from 'socket.io';

const tracer = trace.getTracer('realtime');

export class SocketEmitter {
  private io?: SocketServer;

  attach(io: SocketServer): void {
    this.io = io;
  }

  detach(): void {
    this.io = undefined;
  }

  emit(rooms: string[], event: string, payload: object): void {
    if (!this.io) {
      return;
    }
    const span = tracer.startSpan(`ws.emit ${event}`, {
      attributes: { 'ws.event': event, 'ws.rooms': rooms.join(',') },
    });
    this.io.to(rooms).emit(event, payload);
    span.end();
  }
}

export const socketEmitter = new SocketEmitter();
