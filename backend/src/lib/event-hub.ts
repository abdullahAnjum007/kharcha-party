import type { WebSocket } from 'ws';

export type GroupEvent = {
  type: string;
  groupId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export class EventHub {
  private readonly clients = new Map<string, Set<WebSocket>>();

  subscribe(groupId: string, socket: WebSocket) {
    const groupClients = this.clients.get(groupId) ?? new Set<WebSocket>();
    groupClients.add(socket);
    this.clients.set(groupId, groupClients);

    socket.once('close', () => {
      groupClients.delete(socket);
      if (groupClients.size === 0) this.clients.delete(groupId);
    });
  }

  publish(event: GroupEvent) {
    const message = JSON.stringify(event);
    for (const socket of this.clients.get(event.groupId) ?? []) {
      if (socket.readyState === 1) socket.send(message);
    }
  }

  closeAll() {
    for (const clients of this.clients.values()) {
      for (const socket of clients) socket.close(1001, 'Server shutting down');
    }
    this.clients.clear();
  }
}
