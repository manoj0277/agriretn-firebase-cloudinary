// REACT NATIVE & BACKEND MIGRATION NOTE:
// This context currently uses local mock data (`mockItems`). In a real application,
// this would be replaced with API calls to your Node.js/Express backend, which
// would in turn query your PostgreSQL database hosted on a service like Render.

import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Item } from '../types';
import { useToast } from './ToastContext';
import { useNotification } from './NotificationContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

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
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/items`);
                if (res.ok) {
                    const data = await res.json();
                    setItems(data);
                }
            } catch {
                showToast('Could not load items.', 'error');
            }
        };
        load();
    }, []);

    const addItem = async (itemData: Omit<Item, 'id'>) => {
        try {
            const res = await fetch(`${API_URL}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
            if (!res.ok) throw new Error('Failed');
            const newItem = await res.json();
            setItems(prev => [newItem, ...prev]);
            showToast('Item submitted for admin approval!', 'success');
        } catch {
            showToast('Failed to add item. Please try again.', 'error');
        }
    };

    const updateItem = async (updatedItem: Item) => {
        try {
            const prev = items.find(i => i.id === updatedItem.id);
            const res = await fetch(`${API_URL}/items/${updatedItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedItem)
            });
            if (!res.ok) throw new Error('Failed');

            setItems(prevItems => prevItems.map(i => i.id === updatedItem.id ? updatedItem : i));
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
            const res = await fetch(`${API_URL}/items/${itemId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setItems(prev => prev.filter(i => i.id !== itemId));
            showToast('Item deleted.', 'warning');
        } catch {
            showToast('Failed to delete item.', 'error');
        }
    };

    const approveItem = async (itemId: number) => {
        try {
            // Assuming update endpoint handles partial updates
            const res = await fetch(`${API_URL}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });
            if (!res.ok) throw new Error('Failed');
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'approved' } : i));
            showToast('Item approved and is now live!', 'success');
        } catch {
            showToast('Failed to approve item.', 'error');
        }
    };

    const rejectItem = async (itemId: number) => {
        try {
            const res = await fetch(`${API_URL}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' })
            });
            if (!res.ok) throw new Error('Failed');
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
