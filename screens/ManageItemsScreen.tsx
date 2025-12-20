import React, { useState, useMemo } from 'react';
import { AppView, Item } from '../types';
import { useItem } from '../context/ItemContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

const ItemAdminCard: React.FC<{ item: Item, onApprove: (id: number) => void, onReject: (id: number) => void, supplierName: string }> = ({ item, onApprove, onReject, supplierName }) => {
    const getStatusClasses = (status: Item['status']) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100">{item.name}</h3>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">Owner: {supplierName} <span className="text-neutral-500">({item.category})</span></p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusClasses(item.status)}`}>
                    {item.status}
                </span>
            </div>
            {item.status === 'pending' && (
                <div className="text-right mt-4 border-t border-neutral-100 dark:border-neutral-600 pt-3 flex justify-end space-x-2">
                    <button onClick={() => onReject(item.id)} className="text-sm bg-red-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-red-700">Reject</button>
                    <button onClick={() => onApprove(item.id)} className="text-sm bg-green-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-green-700">Approve</button>
                </div>
            )}
        </div>
    );
};

const ManageItemsScreen: React.FC = () => {
    const { items, approveItem, rejectItem } = useItem();
    const { allUsers } = useAuth();
    const [filter, setFilter] = useState<'all' | Item['status']>('all');

    const filteredItems = useMemo(() => {
        if (filter === 'all') return items;
        return items.filter(m => m.status === filter);
    }, [items, filter]);

    const getSupplierName = (ownerId: number) => {
        return allUsers.find(u => u.id === ownerId)?.name || 'Unknown';
    }

    return (
        <div className="dark:text-neutral-200 bg-green-50 dark:bg-neutral-900 min-h-screen">
            <div className="p-4">
                <div className="flex space-x-2 mb-4">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full capitalize ${filter === status ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <div className="space-y-3">
                    {filteredItems.map(item => (
                        <ItemAdminCard
                            key={item.id}
                            item={item}
                            onApprove={approveItem}
                            onReject={rejectItem}
                            supplierName={getSupplierName(item.ownerId)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManageItemsScreen;