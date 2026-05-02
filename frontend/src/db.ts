import Dexie, { type Table } from 'dexie';
import type { Note, Label } from './types';

export interface SyncQueueItem {
    id?: number;
    action: 'create' | 'update' | 'delete';
    type: 'note' | 'label' | 'image';
    data: any;
    entityId: number | string; // local or remote ID
    timestamp: number;
}

export class MyDatabase extends Dexie {
    notes!: Table<Note>;
    shared_notes!: Table<Note>;
    labels!: Table<Label>;
    preferences!: Table<any>;
    syncQueue!: Table<SyncQueueItem>;

    constructor() {
        super('NotesAppDB');
        this.version(5).stores({
            notes: 'id, title, content, is_pinned, is_locked, created_at, updated_at, sync_status',
            shared_notes: 'id, title, content, is_pinned, is_locked, created_at, updated_at',
            labels: 'id, name, sync_status',
            syncQueue: '++id, action, type, entityId, timestamp, [type+entityId]',
            preferences: 'id'
        });
    }
}

export const db = new MyDatabase();
