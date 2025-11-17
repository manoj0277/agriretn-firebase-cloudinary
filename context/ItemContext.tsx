// REACT NATIVE & BACKEND MIGRATION NOTE:
// This context currently uses local mock data (`mockItems`). In a real application,
// this would be replaced with API calls to your Node.js/Express backend, which
// would in turn query your PostgreSQL database hosted on a service like Render.

import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Item } from '../types';
import { useToast } from './ToastContext';
import { useNotification } from './NotificationContext';
import { supabase, supabaseConfigured } from '../lib/supabase';

interface ItemContextType {
    items: Item[];
    addItem: (item: Omit<Item, 'id'>) => void;
    updateItem: (updatedItem: Item) => void;
    deleteItem: (itemId: number) => void;
    approveItem: (itemId: number) => void;
    rejectItem: (itemId: number) => void;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<Item[]>([]);
    const { showToast } = useToast();
    const { addNotification } = useNotification() as any;
    
    useEffect(() => {
        const cached = localStorage.getItem('agrirent-items-cache');
        if (cached) {
            try {
                const parsed = JSON.parse(cached) as Item[];
                if (Array.isArray(parsed)) setItems(parsed);
            } catch {}
        }
        const load = async () => {
            if (!supabaseConfigured) return;
            try {
                const { data, error } = await supabase.from('items').select('*');
                if (error) throw error;
                const arr = (data || []) as Item[];
                setItems(arr);
                localStorage.setItem('agrirent-items-cache', JSON.stringify(arr));
            } catch {
                showToast('Could not load items.', 'error');
            }
        };
        load();
    }, []);

    const addItem = async (itemData: Omit<Item, 'id'>) => {
        try {
            const newItem: Item = { id: Date.now(), ...itemData } as Item;
            const { error } = await supabase.from('items').upsert([newItem]);
            if (error) throw error;
            setItems(prev => {
                const next = [newItem, ...prev];
                localStorage.setItem('agrirent-items-cache', JSON.stringify(next));
                return next;
            });
            showToast('Item submitted for admin approval!', 'success');
        } catch {
            showToast('Failed to add item. Please try again.', 'error');
        }
    };

    const updateItem = async (updatedItem: Item) => {
        try {
            const prev = items.find(i => i.id === updatedItem.id);
            const { error } = await supabase.from('items').update({ ...updatedItem }).eq('id', updatedItem.id);
            if (error) throw error;
            setItems(prev => {
                const next = prev.map(i => i.id === updatedItem.id ? updatedItem : i);
                localStorage.setItem('agrirent-items-cache', JSON.stringify(next));
                return next;
            });
            showToast('Item updated successfully!', 'success');
            if (prev) {
                const inc = prev.purposes.some(p => {
                    const next = updatedItem.purposes.find(x => x.name === p.name);
                    return next && next.price > p.price * 1.3;
                });
                if (inc) {
                    addNotification && addNotification({ userId: 0, message: `Rapid price increase detected for item ${updatedItem.id}.`, type: 'admin' });
                }
            }
        } catch {
            showToast('Failed to update item.', 'error');
        }
    };

    const deleteItem = async (itemId: number) => {
        try {
            const { error } = await supabase.from('items').delete().eq('id', itemId);
            if (error) throw error;
            setItems(prev => {
                const next = prev.filter(i => i.id !== itemId);
                localStorage.setItem('agrirent-items-cache', JSON.stringify(next));
                return next;
            });
            showToast('Item deleted.', 'warning');
        } catch {
            showToast('Failed to delete item.', 'error');
        }
    };

    const approveItem = async (itemId: number) => {
        try {
            const { error } = await supabase.from('items').update({ status: 'approved' }).eq('id', itemId);
            if (error) throw error;
            setItems(prev => {
                const next = prev.map(i => i.id === itemId ? { ...i, status: 'approved' } : i);
                localStorage.setItem('agrirent-items-cache', JSON.stringify(next));
                return next;
            });
            showToast('Item approved and is now live!', 'success');
        } catch {
            showToast('Failed to approve item.', 'error');
        }
    };

    const rejectItem = async (itemId: number) => {
        try {
            const { error } = await supabase.from('items').update({ status: 'rejected' }).eq('id', itemId);
            if (error) throw error;
            setItems(prev => {
                const next = prev.map(i => i.id === itemId ? { ...i, status: 'rejected' } : i);
                localStorage.setItem('agrirent-items-cache', JSON.stringify(next));
                return next;
            });
            showToast('Item rejected.', 'warning');
        } catch {
            showToast('Failed to reject item.', 'error');
        }
    };


    const value = useMemo(() => ({ items, addItem, updateItem, deleteItem, approveItem, rejectItem }), [items]);

    return (
        <ItemContext.Provider value={value}>
            {children}
        </ItemContext.Provider>
    );
};

export const useItem = (): ItemContextType => {
    const context = useContext(ItemContext);
    if (context === undefined) {
        throw new Error('useItem must be used within an ItemProvider');
    }
    return context;
};
