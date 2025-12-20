import React, { useState, useMemo } from 'react';
import { useCommunity } from '../../context/CommunityContext';
import { useAuth } from '../../context/AuthContext';
import { ForumPost } from '../../types';

const MODERATION_KEYWORDS = ['fraud', 'abuse', 'illegal', 'commission', 'app management'];

const CommunityManagementScreen: React.FC = () => {
    const { allPosts, deletePost, deleteReply, closePost, addReply } = useCommunity();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

    // Modal state for reply (within modal)
    const [replyContent, setReplyContent] = useState('');

    const filteredPosts = useMemo(() => {
        return (allPosts || []).filter(post => {
            if (!post) return false;
            return (post.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (post.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (post.replies || []).some(r => (r?.content || '').toLowerCase().includes(searchTerm.toLowerCase()));
        });
    }, [allPosts, searchTerm]);

    const stats = useMemo(() => {
        const validPosts = (allPosts || []).filter(p => !!p);
        const total = validPosts.length;
        const closed = validPosts.filter(p => p.status === 'closed').length;
        const open = total - closed;
        return { total, open, closed };
    }, [allPosts]);

    const highlightText = (text: any) => {
        if (!text) return '';
        const str = String(text);
        const lowerText = str.toLowerCase();
        const hasKeyword = MODERATION_KEYWORDS.some(k => lowerText.includes(k));
        if (hasKeyword) {
            return <span className="text-red-500 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 px-1 rounded">{str}</span>;
        }
        return str;
    };

    const handleReplySubmit = async (postId: number) => {
        if (!user) {
            alert("You must be logged in to reply.");
            return;
        }
        if (!replyContent.trim()) return;

        try {
            await addReply(postId, {
                authorId: user.id,
                content: `[${user.role}] ${replyContent}`,
            });
            setReplyContent('');
        } catch (e) {
            console.error("Reply failed", e);
            alert("Failed to send reply. Please try again.");
        }
    };

    const handleClosePost = async (e: React.MouseEvent, postId: number) => {
        e.stopPropagation();
        if (!user) {
            alert("System error: User context missing. Try refreshing.");
            return;
        }
        if (window.confirm('Are you sure you want to close this post? It will disappear from the public feed after 12 hours.')) {
            await closePost(postId, user.id);
            if (selectedPost?.id === postId) setSelectedPost(null); // Close modal if open
        }
    };

    const handleDeletePost = async (e: React.MouseEvent, postId: number) => {
        e.stopPropagation();
        if (window.confirm('Delete this post permanently?')) {
            await deletePost(postId);
            if (selectedPost?.id === postId) setSelectedPost(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans p-6 overflow-y-auto pb-20">
            {/* Header / Stats */}
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Community Manager</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1"> oversee discussions, handle reports, and moderate content.</p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-[100px] text-center">
                            <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-[100px] text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.open}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Open</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-[100px] text-center">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.closed}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Closed</div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <input
                        type="text"
                        placeholder="Search posts, content, or replies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                {/* Posts Grid */}
                <div className="space-y-4">
                    {filteredPosts.map((post) => {
                        if (!post) return null;
                        const isClosed = post.status === 'closed';
                        return (
                            <div
                                key={post.id}
                                onClick={() => setSelectedPost(post)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group ${selectedPost?.id === post.id
                                    ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800'
                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600'
                                    }`}
                            >
                                <div className="p-4 flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            {isClosed && (
                                                <span className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                    Closed
                                                </span>
                                            )}
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                                                {highlightText(post.title || 'Untitled')}
                                            </h3>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-2">
                                            {highlightText(post.content || '')}
                                        </p>
                                        <div className="flex items-center text-xs text-gray-400 gap-2">
                                            <span>UID: {String(post.authorId || '?').slice(0, 8)}...</span>
                                            <span>&bull;</span>
                                            <span>{new Date(post.timestamp || Date.now()).toLocaleDateString()}</span>
                                            {(post.replies || []).length > 0 && (
                                                <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded-md text-gray-500 dark:text-gray-300">
                                                    {(post.replies || []).length} replies
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Actions (Prevent bubbling) */}
                                    <div className="flex items-center gap-2">
                                        {!isClosed && (
                                            <button
                                                onClick={(e) => handleClosePost(e, post.id)}
                                                className="text-amber-500 hover:text-amber-700 p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Close Post"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleDeletePost(e, post.id)}
                                            className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Post"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredPosts.length === 0 && (
                        <div className="text-center py-12 text-gray-500">No discussions found. The list is empty.</div>
                    )}
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {selectedPost && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white pr-8">
                                    {(selectedPost?.title || 'Untitled Post')}
                                </h2>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <span>Posted by {selectedPost?.authorId || 'Unknown'}</span>
                                    <span>&bull;</span>
                                    <span>{new Date(selectedPost?.timestamp || Date.now()).toLocaleString()}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedPost(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Main Body */}
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
                                    {highlightText(selectedPost?.content || '')}
                                </p>
                            </div>

                            {/* Status Banner */}
                            {selectedPost?.status === 'closed' && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg p-3 flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    <div>
                                        <p className="text-sm font-bold text-red-800 dark:text-red-200">This post is closed.</p>
                                        {selectedPost?.closedBy && (
                                            <p className="text-xs text-red-600 dark:text-red-300">Closed by {selectedPost.closedBy} on {new Date(selectedPost.closedAt!).toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Replies List */}
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Replies ({(selectedPost?.replies || []).length})</h3>
                                <div className="space-y-4">
                                    {(selectedPost?.replies || []).map((reply) => (
                                        <div key={reply.id} className="flex gap-3 text-sm group">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
                                                {(reply.authorId || '?').slice(0, 2)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-gray-900 dark:text-white text-xs">{reply.authorId || 'Anonymous'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">{new Date(reply.timestamp).toLocaleString()}</span>
                                                        <button
                                                            onClick={() => window.confirm('Delete reply?') && deleteReply(selectedPost!.id, reply.id)}
                                                            className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                            title="Delete Reply"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none text-gray-700 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700">
                                                    {highlightText(reply.content || '')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(selectedPost?.replies || []).length === 0 && (
                                        <p className="text-center text-gray-400 italic text-sm py-4">No replies yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer - Actions */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex gap-3 items-end">
                            {selectedPost.status !== 'closed' ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder={`Reply as ${user?.role || 'Admin'}...`}
                                        className="flex-1 w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    />
                                    <button
                                        onClick={() => handleReplySubmit(selectedPost.id)}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                                    >
                                        Reply
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 text-center text-sm text-gray-500 italic">
                                    Actions disabled on closed posts.
                                </div>
                            )}

                            {selectedPost.status !== 'closed' && (
                                <button
                                    onClick={(e) => handleClosePost(e, selectedPost.id)}
                                    className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg flex items-center gap-1 transition-colors text-sm font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    Close
                                </button>
                            )}
                            <button
                                onClick={(e) => handleDeletePost(e, selectedPost.id)}
                                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg flex items-center gap-1 transition-colors text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityManagementScreen;
