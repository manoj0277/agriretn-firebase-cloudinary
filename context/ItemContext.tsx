// REACT NATIVE & BACKEND MIGRATION NOTE:
// This context currently uses local mock data (`mockItems`). In a real application,
// this would be replaced with API calls to your Node.js/Express backend, which
// would in turn query your PostgreSQL database hosted on a service like Render.

import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Item } from '../types';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabase';

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
    
    useEffect(() => {
        const load = async () => {
            try {
                const { data, error } = await supabase.from('items').select('*');
                if (error) throw error;
                setItems((data || []) as Item[]);
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
            setItems(prev => [newItem, ...prev]);
            showToast('Item submitted for admin approval!', 'success');
        } catch {
            showToast('Failed to add item. Please try again.', 'error');
        }
    };

    const updateItem = async (updatedItem: Item) => {
        try {
            const { error } = await supabase.from('items').update({ ...updatedItem }).eq('id', updatedItem.id);
            if (error) throw error;
            setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
            showToast('Item updated successfully!', 'success');
        } catch {
            showToast('Failed to update item.', 'error');
        }
    };

    const deleteItem = async (itemId: number) => {
        try {
            const { error } = await supabase.from('items').delete().eq('id', itemId);
            if (error) throw error;
            setItems(prev => prev.filter(i => i.id !== itemId));
            showToast('Item deleted.', 'warning');
        } catch {
            showToast('Failed to delete item.', 'error');
        }
    };

    const approveItem = async (itemId: number) => {
        try {
            const { error } = await supabase.from('items').update({ status: 'approved' }).eq('id', itemId);
            if (error) throw error;
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'approved' } : i));
            showToast('Item approved and is now live!', 'success');
        } catch {
            showToast('Failed to approve item.', 'error');
        }
    };

    const rejectItem = async (itemId: number) => {
        try {
            const { error } = await supabase.from('items').update({ status: 'rejected' }).eq('id', itemId);
            if (error) throw error;
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'rejected' } : i));
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
