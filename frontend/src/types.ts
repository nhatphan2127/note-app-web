export interface Label {
    id: number;
    name: string;
    sync_status?: 'synced' | 'pending';
}

export interface NoteImage {
    id: number;
    image_path: string;
}

export interface Note {
    id: number;
    title: string;
    content: string;
    is_pinned: boolean;
    pinned_at?: string;
    is_shared?: boolean;
    color?: string;
    labels: Label[];
    images: NoteImage[];
    created_at?: string;
    updated_at: string;
    sync_status?: 'synced' | 'pending';
    is_locked?: boolean;
    user_id: number;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    pivot?: {
        permission: 'read-only' | 'edit';
        shared_at: string;
    };
}
