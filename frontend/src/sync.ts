import api from './api';
import { db, type SyncQueueItem } from './db';
import type { Note, Label } from './types';

export const syncData = async () => {
    if (!navigator.onLine) return;

    try {
        const queue = await db.syncQueue.orderBy('timestamp').toArray();
        const labelMap: Record<number, number> = {};

        // 1. Sync Labels first
        const labelItems = queue.filter(item => item.type === 'label');
        for (const item of labelItems) {
            try {
                if (item.action === 'create') {
                    const response = await api.post('/labels', item.data);
                    const serverId = response.data.id;
                    const tempId = Number(item.entityId);
                    console.log(`Label created on server with ID ${serverId} (temp ID was ${tempId})`);
                    labelMap[tempId] = serverId;
                    
                    await db.labels.delete(tempId);
                    await db.labels.put({ ...response.data, sync_status: 'synced' });

                    // Update local notes that use this temp label ID
                    const affectedNotes = await db.notes.toArray();
                    for (const note of affectedNotes) {
                        if (note.labels?.some(l => l.id === tempId)) {
                            const updatedLabels = note.labels.map(l => 
                                l.id === tempId ? { ...l, id: serverId } : l
                            );
                            await db.notes.update(note.id, { labels: updatedLabels });
                        }
                    }
                } else if (item.action === 'update') {
                    const response = await api.put(`/labels/${item.entityId}`, item.data);
                    await db.labels.update(Number(item.entityId), { ...response.data, sync_status: 'synced' });
                } else if (item.action === 'delete') {
                    await api.delete(`/labels/${item.entityId}`);
                }
                await db.syncQueue.delete(item.id!);
            } catch (err) {
                if (handleSyncError(err, item)) break;
            }
        }

        // 2. Sync Notes
        const noteItems = queue.filter(item => item.type === 'note');
        for (const item of noteItems) {
            try {
                let data = { ...item.data };
                // Map temporary label IDs to real IDs in note data
                if (data.label_ids) {
                    data.label_ids = data.label_ids.map((id: number) => labelMap[id] || id);
                }

                if (item.action === 'create') {
                    const response = await api.post('/notes', data);
                    await db.notes.delete(Number(item.entityId));
                    await db.notes.put({ ...response.data, sync_status: 'synced' });
                } else if (item.action === 'update') {
                    const response = await api.put(`/notes/${item.entityId}`, data);
                    await db.notes.update(Number(item.entityId), { ...response.data, sync_status: 'synced' });
                } else if (item.action === 'delete') {
                    await api.delete(`/notes/${item.entityId}`);
                }
                await db.syncQueue.delete(item.id!);
            } catch (err) {
                if (handleSyncError(err, item)) break;
            }
        }

        // 3. Sync User Preferences
        const remainingItems = await db.syncQueue.orderBy('timestamp').toArray();
        for (const item of remainingItems) {
            try {
                if (item.type === 'image' && item.action === 'update' && item.entityId === 'preferences') {
                    await api.put('/preferences', item.data);
                } else if (item.type === 'image' && item.action === 'delete') {
                    await api.delete(`/note-images/${item.entityId}`);
                }
                await db.syncQueue.delete(item.id!);
            } catch (err) {
                if (handleSyncError(err, item)) break;
            }
        }

        // 4. Fetch fresh data
        const [notesRes, labelsRes] = await Promise.all([
            api.get('/notes'),
            api.get('/labels')
        ]);

        const safeUpdate = async (table: any, serverItems: any[]) => {
            for (const item of serverItems) {
                const localItem = await table.get(item.id);
                if (!localItem || localItem.sync_status === 'synced') {
                    await table.put({ ...item, sync_status: 'synced' });
                }
            }
        };

        await safeUpdate(db.notes, notesRes.data);
        await safeUpdate(db.labels, labelsRes.data);

        console.log('Sync complete');
    } catch (err) {
        console.error('Sync failed', err);
    }
};

const handleSyncError = (err: any, item: any): boolean => {
    console.error('Failed to sync item', item, err);
    const status = err.response?.status;
    if (status === 404 || status === 422) {
        db.syncQueue.delete(item.id!);
        return false; // Continue with next item
    }
    return true; // Stop processing (network error, etc.)
};

export const handleNoteUpdate = async (noteId: number, data: Partial<Note>) => {
    const existing = await db.notes.get(noteId);
    if (existing) {
        const updated = { 
            ...existing, 
            ...data, 
            updated_at: new Date().toISOString(),
            sync_status: 'pending' as const
        };

        // If pinning status changed, update pinned_at locally
        if (data.is_pinned !== undefined && data.is_pinned !== existing.is_pinned) {
            updated.pinned_at = data.is_pinned ? new Date().toISOString() : undefined;
        }

        await db.notes.put(updated);
    }

    if (navigator.onLine && noteId > 0) {
        try {
            const response = await api.put(`/notes/${noteId}`, data);
            await db.notes.update(noteId, { ...response.data, sync_status: 'synced' });
        } catch (err) {
            await addToSyncQueue('update', 'note', data, noteId);
        }
    } else {
        await addToSyncQueue('update', 'note', data, noteId);
    }
};

let noteIdCounter = -Date.now();

export const handleNoteCreate = async (data: { title: string; content: string }): Promise<Note> => {
    const tempId = noteIdCounter--;
    const newNote: Note = {
        id: tempId,
        title: data.title,
        content: data.content,
        is_pinned: false,
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
        labels: [],
        images: [],
        user_id: 0
    };
    
    await db.notes.put(newNote);

    if (navigator.onLine) {
        try {
            const response = await api.post('/notes', data);
            await db.notes.delete(tempId);
            const syncedNote = { ...response.data, sync_status: 'synced' };
            await db.notes.put(syncedNote);
            return syncedNote;
        } catch (err) {
            await addToSyncQueue('create', 'note', data, tempId);
            return newNote;
        }
    } else {
        await addToSyncQueue('create', 'note', data, tempId);
        return newNote;
    }
};

export const handleNoteDelete = async (noteId: number) => {
    await db.notes.delete(noteId);

    if (navigator.onLine && noteId > 0) {
        try {
            await api.delete(`/notes/${noteId}`);
        } catch (err) {
            await addToSyncQueue('delete', 'note', null, noteId);
        }
    } else if (noteId > 0) {
        await addToSyncQueue('delete', 'note', null, noteId);
    } else {
        // Created offline and deleted before sync
        const items = await db.syncQueue.where({ entityId: noteId, type: 'note' }).toArray();
        for (const item of items) {
            await db.syncQueue.delete(item.id!);
        }
    }
};

export const handleLabelCreate = async (data: { name: string }): Promise<Label> => {
    const tempId = noteIdCounter--;
    const newLabel: Label = {
        id: tempId,
        name: data.name,
        sync_status: 'pending'
    };

    await db.labels.put(newLabel);

    if (navigator.onLine) {
        try {
            const response = await api.post('/labels', data);
            await db.labels.delete(tempId);
            const syncedLabel = { ...response.data, sync_status: 'synced' };
            await db.labels.put(syncedLabel);
            return syncedLabel;
        } catch (err) {
            await addToSyncQueue('create', 'label', data, tempId);
            return newLabel;
        }
    } else {
        await addToSyncQueue('create', 'label', data, tempId);
        return newLabel;
    }
};

export const handleLabelUpdate = async (labelId: number, data: { name: string }): Promise<Label> => {
    const existing = await db.labels.get(labelId);
    const updatedLabel = { ...existing, ...data, sync_status: 'pending' } as Label;
    await db.labels.put(updatedLabel);

    if (navigator.onLine && labelId > 0) {
        try {
            const response = await api.put(`/labels/${labelId}`, data);
            const syncedLabel = { ...response.data, sync_status: 'synced' };
            await db.labels.put(syncedLabel);
            return syncedLabel;
        } catch (err) {
            await addToSyncQueue('update', 'label', data, labelId);
            return updatedLabel;
        }
    } else if (labelId > 0) {
        await addToSyncQueue('update', 'label', data, labelId);
        return updatedLabel;
    } else {
        const createItem = await db.syncQueue.where({ entityId: labelId, type: 'label', action: 'create' }).first();
        if (createItem) {
            await db.syncQueue.update(createItem.id!, {
                data: { ...createItem.data, ...data },
                timestamp: Date.now()
            });
        }
        return updatedLabel;
    }
};

export const handleLabelDelete = async (labelId: number) => {
    await db.labels.delete(labelId);

    if (navigator.onLine && labelId > 0) {
        try {
            await api.delete(`/labels/${labelId}`);
        } catch (err) {
            await addToSyncQueue('delete', 'label', null, labelId);
        }
    } else if (labelId > 0) {
        await addToSyncQueue('delete', 'label', null, labelId);
    } else {
        // Created offline and deleted before sync
        const items = await db.syncQueue.where({ entityId: labelId, type: 'label' }).toArray();
        for (const item of items) {
            await db.syncQueue.delete(item.id!);
        }
    }
};

export const handleImageDelete = async (noteId: number, imageId: number) => {
    const note = await db.notes.get(noteId);
    if (note && note.images) {
        const updatedImages = note.images.filter(img => img.id !== imageId);
        await db.notes.update(noteId, { images: updatedImages, sync_status: 'pending' });
    }

    if (navigator.onLine && imageId > 0) {
        try {
            await api.delete(`/note-images/${imageId}`);
        } catch (err) {
            await addToSyncQueue('delete', 'image', null, imageId);
        }
    } else if (imageId > 0) {
        await addToSyncQueue('delete', 'image', null, imageId);
    }
};

export const addToSyncQueue = async (action: SyncQueueItem['action'], type: SyncQueueItem['type'], data: any, entityId: number | string) => {
    if (action === 'update') {
        const existing = await db.syncQueue.where({ entityId, action: 'update', type }).first();
        if (existing) {
            await db.syncQueue.update(existing.id!, { 
                data: { ...existing.data, ...data },
                timestamp: Date.now() 
            });
            return;
        }
    }

    await db.syncQueue.add({
        action,
        type,
        data,
        entityId,
        timestamp: Date.now()
    });
};
