import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { ForumPost, CommunityReply } from '../types';
import { useToast } from './ToastContext';
import { auth } from '../src/lib/firebase';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface CommunityContextType {
    posts: ForumPost[];
    addPost: (post: Omit<ForumPost, 'id' | 'replies' | 'timestamp'>) => Promise<void>;
    addReply: (postId: number, reply: Omit<CommunityReply, 'id' | 'timestamp'>) => Promise<void>;
    deletePost: (postId: number | string) => Promise<void>;
    deleteReply: (postId: number | string, replyId: number | string) => Promise<void>;
    closePost: (postId: number | string, userId: string) => Promise<void>;
    allPosts: ForumPost[]; // Exposed for Admin/Founder generic views that might want everything
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await fetch(`${API_URL}/posts`);
                if (!response.ok) throw new Error('Failed to fetch posts');
                const data = await response.json();
                let rows = (Array.isArray(data) ? data : []) as ForumPost[];
                rows.sort((a, b) => (b.timestamp?.localeCompare?.(a.timestamp || '') || 0));
                setPosts(rows);
            } catch (error) {
                // Silently log error - don't show toast on login page
                console.error('Failed to load community posts:', error);
            }
        };
        fetchPosts();
    }, []);

    const addPost = async (postData: Omit<ForumPost, 'id' | 'replies' | 'timestamp'>) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    ...postData,
                    timestamp: new Date().toISOString()
                })
            });
            if (!response.ok) throw new Error('Failed to create post');
            const newPost = await response.json();
            setPosts(prev => [newPost, ...prev]);
            showToast('Post created successfully!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to create post.', 'error');
        }
    };

    const addReply = async (postId: number | string, replyData: Omit<CommunityReply, 'id' | 'timestamp'>) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_URL}/posts/${postId}/replies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    ...replyData,
                    timestamp: new Date().toISOString()
                })
            });
            if (!response.ok) throw new Error('Failed to add reply');
            const newReply = await response.json();

            setPosts(prev => prev.map(post => {
                if (post.id === postId) {
                    return { ...post, replies: [...(post.replies || []), newReply] };
                }
                return post;
            }));
            showToast('Reply posted!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to post reply.', 'error');
        }
    };

    const deletePost = async (postId: number | string) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_URL}/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) throw new Error('Failed to delete post');
            setPosts(prev => prev.filter(post => post.id !== postId));
            showToast('Post deleted successfully!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to delete post.', 'error');
        }
    };

    const deleteReply = async (postId: number | string, replyId: number | string) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_URL}/posts/${postId}/replies/${replyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) throw new Error('Failed to delete reply');

            setPosts(prev => prev.map(post => {
                if (post.id === postId) {
                    return { ...post, replies: post.replies.filter(r => r.id !== replyId) };
                }
                return post;
            }));
            showToast('Reply deleted!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to delete reply.', 'error');
        }
    };

    const closePost = async (postId: number | string, userId: string) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_URL}/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    status: 'closed',
                    closedAt: new Date().toISOString(),
                    closedBy: userId
                })
            });
            if (!response.ok) throw new Error('Failed to close post');

            setPosts(prev => prev.map(post => {
                if (post.id === postId) {
                    return { ...post, status: 'closed', closedAt: new Date().toISOString(), closedBy: userId };
                }
                return post;
            }));
            showToast('Post closed successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to close post', 'error');
        }
    };

    // Filter out posts that are closed and older than 12 hours
    const visiblePosts = useMemo(() => {
        const now = new Date().getTime();
        return posts.filter(post => {
            if (!post) return false;
            if (post.status === 'closed' && post.closedAt) {
                const closedTime = new Date(post.closedAt).getTime();
                // 12 hours in milliseconds = 12 * 60 * 60 * 1000 = 43200000
                if (now - closedTime > 43200000) {
                    return false; // Hide if closed > 12h ago
                }
            }
            return true;
        });
    }, [posts]);

    const value = useMemo(() => ({ posts: visiblePosts, allPosts: posts, addPost, addReply, deletePost, deleteReply, closePost }), [visiblePosts, posts]);

    return (
        <CommunityContext.Provider value={value}>
            {children}
        </CommunityContext.Provider>
    );
};

export const useCommunity = (): CommunityContextType => {
    const context = useContext(CommunityContext);
    if (context === undefined) {
        throw new Error('useCommunity must be used within a CommunityProvider');
    }
    return context;
};
