import type { EventHub } from '../lib/event-hub.js';
import type { KharchaRepository } from '../db/repository.js';
import type { ExpenseService } from './expenses/expense.service.js';
import type { GroupService } from './groups/group.service.js';
import type { SettlementService } from './settlements/settlement.service.js';

export type Services = {
  repository: KharchaRepository;
  groups: GroupService;
  expenses: ExpenseService;
  settlements: SettlementService;
  events: EventHub;
};
