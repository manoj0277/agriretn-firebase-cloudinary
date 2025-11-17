import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Item } from '../types';
import { useToast } from './ToastContext';
import { supabase } from '../../lib/supabase';

interface ItemContextType {
    items: Item[];
    addItem: (item: Omit<Item, 'id'>) => Promise<void>;
    updateItem: (updatedItem: Item) => Promise<void>;
    deleteItem: (itemId: number) => Promise<void>;
    approveItem: (itemId: number) => Promise<void>;
    rejectItem: (itemId: number) => Promise<void>;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<Item[]>([]);
    const { showToast } = useToast();
    
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const { data, error } = await supabase.from('items').select('*');
                if (error) throw error;
                setItems((data || []) as Item[]);
            } catch (error) {
                showToast("Could not load items from the server.", "error");
            }
        };
        fetchItems();
    }, []);

    const addItem = async (itemData: Omit<Item, 'id'>) => {
        try {
            const newItem: Item = { id: Date.now(), ...itemData } as Item;
            const { error } = await supabase.from('items').upsert([newItem]);
            if (error) throw error;
            setItems(prev => [...prev, newItem]);
            showToast('Item submitted for admin approval!', 'success');
        } catch (error) {
            showToast('Failed to add item.', 'error');
        }
    };

    const updateItem = async (updatedItem: Item) => {
        try {
            const { error } = await supabase.from('items').update({ ...updatedItem }).eq('id', updatedItem.id);
            if (error) throw error;
            setItems(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
            showToast('Item updated successfully!', 'success');
        } catch (error) {
            showToast('Failed to update item.', 'error');
        }
    };

    const deleteItem = async (itemId: number) => {
        try {
            const { error } = await supabase.from('items').delete().eq('id', itemId);
            if (error) throw error;
            setItems(prev => prev.filter(m => m.id !== itemId));
            showToast('Item deleted.', 'warning');
        } catch (error) {
            showToast('Failed to delete item.', 'error');
        }
    };
    
    const adminItemAction = async (itemId: number, action: 'approve' | 'reject') => {
        try {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            const { error } = await supabase.from('items').update({ status: newStatus }).eq('id', itemId);
            if (error) throw error;
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
            showToast(`Item ${action}ed successfully.`, 'success');
        } catch (error) {
            showToast(`Failed to ${action} item.`, 'error');
        }
    };

    const approveItem = (itemId: number) => adminItemAction(itemId, 'approve');
    const rejectItem = (itemId: number) => adminItemAction(itemId, 'reject');

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
