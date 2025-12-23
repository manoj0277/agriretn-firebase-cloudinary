// REACT NATIVE & BACKEND MIGRATION NOTE:
// This context currently uses local mock data (`mockItems`). In a real application,
// this would be replaced with API calls to your Node.js/Express backend, which
// would in turn query your PostgreSQL database hosted on a service like Render.

import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Item, UserRole } from '../types';
import { useToast } from './ToastContext';
import { useNotification } from './NotificationContext';
import { auth, db } from '../src/lib/firebase';
import { onSnapshot, collection, query, where, limit, orderBy, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface ItemContextType {
    items: Item[];
    loadMoreItems: (reset?: boolean) => Promise<void>;
    hasMoreItems: boolean;
    isLoadingItems: boolean;
    addItem: (item: Omit<Item, 'id'>) => void;
    updateItem: (updatedItem: Item, showToastMessage?: boolean) => void;
    deleteItem: (itemId: number) => void;
    approveItem: (itemId: number) => void;
    rejectItem: (itemId: number) => void;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<Item[]>([]);
    const { showToast } = useToast();
    const { addNotification } = useNotification() as any;

    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMoreItems, setHasMoreItems] = useState(true);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const ITEMS_PER_PAGE = 15;

    const loadMoreItems = async (reset: boolean = false) => {
        if ((!hasMoreItems && !reset) || isLoadingItems) return;

        setIsLoadingItems(true);
        try {
            let q;
            if (reset) {
                // Fetch first batch
                q = query(collection(db, 'items'), orderBy('id', 'desc'), limit(ITEMS_PER_PAGE));
            } else {
                // Fetch next batch
                if (!lastVisible) {
                    setIsLoadingItems(false);
                    return;
                }
                q = query(
                    collection(db, 'items'),
                    orderBy('id', 'desc'),
                    startAfter(lastVisible),
                    limit(ITEMS_PER_PAGE)
                );
            }

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                if (reset) setItems([]);
                setHasMoreItems(false);
            } else {
                const loadedItems = snapshot.docs.map(doc => ({ id: Number(doc.id) || doc.id, ...(doc.data() as Record<string, any>) } as unknown as Item));
                // Fix IDs if needed (same as before)
                const finalItems = loadedItems.map(i => ({ ...i, id: Number(i.id) || i.id }));

                if (reset) {
                    setItems(finalItems as Item[]);
                } else {
                    setItems(prev => {
                        const existingIds = new Set(prev.map(i => i.id));
                        const uniqueNew = (finalItems as Item[]).filter(i => !existingIds.has(i.id));
                        return [...prev, ...uniqueNew];
                    });
                }

                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                if (snapshot.docs.length < ITEMS_PER_PAGE) {
                    setHasMoreItems(false);
                } else {
                    setHasMoreItems(true);
                }
            }

        } catch (error) {
            console.error('Error loading items:', error);
            // Fallback to API if Firestore fails
            if (reset) fetchItemsViaApi();
            showToast('Failed to load items.', 'error');
        } finally {
            setIsLoadingItems(false);
        }
    };

    // Initial Load
    useEffect(() => {
        loadMoreItems(true);
    }, []);

    const fetchItemsViaApi = async () => {
        // ... existing fallback ...
        // Implementation kept for reference/fallback
        const res = await fetch(`${API_URL}/items`);
        if (res.ok) {
            const data = await res.json();
            setItems(data);
        }
    };

    // Removed global auto-listener to implement pagination.
    // Real-time updates for *single* items (like status change) might need separate handling or
    // we assume optimistic updates + manual refresh are sufficient for this optimization goal.

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

    const updateItem = async (updatedItem: Item, showToastMessage: boolean = true) => {
        try {
            const prev = items.find(i => i.id === updatedItem.id);
            const res = await fetch(`${API_URL}/items/${updatedItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedItem)
            });
            if (!res.ok) throw new Error('Failed');

            setItems(prevItems => prevItems.map(i => i.id === updatedItem.id ? updatedItem : i));
            if (showToastMessage) {
                showToast('Item updated successfully!', 'success');
            }

            if (prev) {
                const inc = prev.purposes.some(p => {
                    const next = updatedItem.purposes.find(x => x.name === p.name);
                    return next && next.price > p.price * 1.3;
                });
                if (inc) {
                    addNotification && addNotification({ userId: '0', message: `Rapid price increase detected for item ${updatedItem.id}.`, type: 'admin' });
                }
            }
        } catch {
            if (showToastMessage) {
                showToast('Failed to update item.', 'error');
            }
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


    const value = useMemo(() => ({ items, loadMoreItems, hasMoreItems, isLoadingItems, addItem, updateItem, deleteItem, approveItem, rejectItem }), [items, hasMoreItems, isLoadingItems]);

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
