import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Item } from '../types';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

const AdminItemApprovalScreen: React.FC = () => {
    const { allUsers } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState<Item[]>([]);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
    const [previewItem, setPreviewItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/admin/items`);
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            } else {
                showToast('Failed to load items', 'error');
            }
        } catch (error) {
            console.error('Error loading items:', error);
            showToast('Error loading items', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        if (statusFilter === 'ALL') return items;
        return items.filter(i => i.status === statusFilter);
    }, [items, statusFilter]);

    const approveItem = async (item: Item) => {
        try {
            const res = await fetch(`${API_URL}/admin/items/${item.id}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });

            if (res.ok) {
                showToast(`Item "${item.name}" approved successfully!`, 'success');
                loadItems(); // Reload list
            } else {
                showToast('Failed to approve item', 'error');
            }
        } catch (error) {
            console.error('Error approving item:', error);
            showToast('Error approving item', 'error');
        }
    };

    const rejectItem = async (item: Item) => {
        const reason = window.prompt('Enter rejection reason (optional):');

        try {
            const res = await fetch(`${API_URL}/admin/items/${item.id}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'rejected',
                    rejectionReason: reason || 'Item does not meet requirements'
                })
            });

            if (res.ok) {
                showToast(`Item "${item.name}" rejected`, 'success');
                loadItems();
            } else {
                showToast('Failed to reject item', 'error');
            }
        } catch (error) {
            console.error('Error rejecting item:', error);
            showToast('Error rejecting item', 'error');
        }
    };

    const requestReupload = async (item: Item) => {
        const message = window.prompt('Enter message for supplier (optional):');

        try {
            const res = await fetch(`${API_URL}/admin/items/${item.id}/request-reupload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message || '' })
            });

            if (res.ok) {
                showToast(`Re-upload requested for "${item.name}"`, 'success');
                loadItems();
            } else {
                showToast('Failed to request re-upload', 'error');
            }
        } catch (error) {
            console.error('Error requesting re-upload:', error);
            showToast('Error requesting re-upload', 'error');
        }
    };

    const getSupplierName = (ownerId: number) => {
        const supplier = allUsers.find(u => u.id === ownerId);
        return supplier?.name || 'Unknown';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
        }
    };

    if (loading) {
        return (
            <div className="p-4 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-neutral-600 dark:text-neutral-400">Loading items...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <h4 className="font-semibold mb-1 text-lg">Item Approvals</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">Review and approve supplier item listings</p>

                {/* Filter Buttons - Icon Based */}
                <div className="flex gap-2 mb-4 overflow-x-auto">
                    <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${statusFilter === 'ALL'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                            }`}
                        title="All Items"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span className="font-medium">{items.length}</span>
                    </button>
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${statusFilter === 'pending'
                            ? 'bg-yellow-500 text-white shadow-md'
                            : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                            }`}
                        title="Pending Approval"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{items.filter(i => i.status === 'pending').length}</span>
                    </button>
                    <button
                        onClick={() => setStatusFilter('approved')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${statusFilter === 'approved'
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/50'
                            }`}
                        title="Approved Items"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{items.filter(i => i.status === 'approved').length}</span>
                    </button>
                    <button
                        onClick={() => setStatusFilter('rejected')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${statusFilter === 'rejected'
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/50'
                            }`}
                        title="Rejected Items"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{items.filter(i => i.status === 'rejected').length}</span>
                    </button>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-neutral-300 dark:border-neutral-600">
                                <th className="p-2">Item</th>
                                <th className="p-2">Supplier</th>
                                <th className="p-2">Category</th>
                                <th className="p-2">Price</th>
                                <th className="p-2">Status</th>
                                <th className="p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => {
                                const minPrice = Math.min(...item.purposes.map(p => p.price));
                                const reuploadCount = (item as any).reuploadCount || 0;

                                return (
                                    <tr key={item.id} className="border-t border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750">
                                        <td className="p-2" style={{ minWidth: '180px' }}>
                                            <div className="flex items-center gap-2">
                                                {item.images && item.images[0] && (
                                                    <img
                                                        src={item.images[0]}
                                                        alt={item.name}
                                                        className="h-12 w-16 object-cover rounded cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                                                        onClick={() => setPreviewItem(item)}
                                                    />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{item.name}</p>
                                                    {reuploadCount > 0 && (
                                                        <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                                                            🔄 {reuploadCount}x
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-2" style={{ minWidth: '120px' }}>
                                            <span className="whitespace-nowrap">{getSupplierName(item.ownerId)}</span>
                                        </td>
                                        <td className="p-2" style={{ minWidth: '100px' }}>{item.category}</td>
                                        <td className="p-2 whitespace-nowrap">₹{minPrice}/hr</td>
                                        <td className="p-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-2 flex-wrap">
                                                {item.status !== 'approved' && (
                                                    <Button
                                                        onClick={() => approveItem(item)}
                                                        variant="primary"
                                                        className="text-xs px-3 py-1"
                                                    >
                                                        Approve
                                                    </Button>
                                                )}
                                                {item.status !== 'rejected' && (
                                                    <Button
                                                        onClick={() => rejectItem(item)}
                                                        variant="danger"
                                                        className="text-xs px-3 py-1"
                                                    >
                                                        Reject
                                                    </Button>
                                                )}
                                                {item.status === 'pending' && (
                                                    <Button
                                                        onClick={() => requestReupload(item)}
                                                        variant="secondary"
                                                        className="text-xs px-3 py-1"
                                                    >
                                                        Request Re-upload
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td className="p-4 text-center text-neutral-500" colSpan={6}>
                                        No {statusFilter !== 'ALL' ? statusFilter : ''} items found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Enhanced Image Preview Modal */}
            {previewItem && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
                    onClick={() => setPreviewItem(null)}
                >
                    <div
                        className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-[70vw] max-h-[85vh] w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with close button */}
                        <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
                            <div>
                                <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-100">{previewItem.name}</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{previewItem.description}</p>
                            </div>
                            <button
                                onClick={() => setPreviewItem(null)}
                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                                title="Close"
                            >
                                <svg className="w-6 h-6 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Main Image Display */}
                        <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-900" style={{ minHeight: '400px', maxHeight: 'calc(85vh - 200px)' }}>
                            {previewItem.images && previewItem.images.length > 0 ? (
                                <>
                                    <img
                                        src={previewItem.images[0]}
                                        alt={previewItem.name}
                                        className="max-h-[50vh] w-auto object-contain rounded-lg shadow-lg"
                                    />

                                    {/* Image Thumbnails (if multiple images) */}
                                    {previewItem.images.length > 1 && (
                                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 max-w-full">
                                            {previewItem.images.map((img, idx) => (
                                                <img
                                                    key={idx}
                                                    src={img}
                                                    alt={`${previewItem.name} ${idx + 1}`}
                                                    className={`h-16 w-20 object-cover rounded cursor-pointer border-2 transition-all hover:scale-105 ${idx === 0
                                                        ? 'border-primary shadow-md'
                                                        : 'border-neutral-300 dark:border-neutral-600 opacity-70 hover:opacity-100'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Swap images
                                                        const newImages = [...previewItem.images];
                                                        [newImages[0], newImages[idx]] = [newImages[idx], newImages[0]];
                                                        setPreviewItem({ ...previewItem, images: newImages });
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-neutral-400 text-center">
                                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p>No images available</p>
                                </div>
                            )}
                        </div>

                        {/* Footer with action buttons */}
                        <div className="flex justify-between items-center p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                            <div className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                <span><strong>Supplier:</strong> {getSupplierName(previewItem.ownerId)}</span>
                                <span className="mx-2">•</span>
                                <span><strong>Category:</strong> {previewItem.category}</span>
                                <span className="mx-2">•</span>
                                <span className={`px-2 py-1 rounded ${getStatusColor(previewItem.status)}`}>
                                    {previewItem.status.charAt(0).toUpperCase() + previewItem.status.slice(1)}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        showToast('Edit functionality coming soon!', 'info');
                                        // TODO: Navigate to edit screen or open edit modal
                                    }}
                                    variant="secondary"
                                    className="text-sm"
                                >
                                    <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Item
                                </Button>
                                {previewItem.status !== 'approved' && (
                                    <Button
                                        onClick={() => {
                                            approveItem(previewItem);
                                            setPreviewItem(null);
                                        }}
                                        variant="primary"
                                        className="text-sm"
                                    >
                                        Approve
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminItemApprovalScreen;
