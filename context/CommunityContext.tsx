import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { ForumPost, CommunityReply } from '../types';
import { useToast } from './ToastContext';
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface CommunityContextType {
    posts: ForumPost[];
    addPost: (post: Omit<ForumPost, 'id' | 'replies'>) => void;
    addReply: (postId: number, reply: Omit<CommunityReply, 'id'>) => void;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        const load = async () => {
            try {
                const resp = await fetch(`${API_URL}/posts`);
                if (resp.ok) {
                    const data = await resp.json();
                    setPosts((data as ForumPost[]).sort((a,b) => (b.timestamp?.localeCompare?.(a.timestamp || '') || 0)));
                } else {
                    showToast('Could not load forum posts.', 'error');
                }
            } catch {
                showToast('Could not load forum posts.', 'error');
            }
        };
        load();
    }, []);

    const addPost = async (postData: Omit<ForumPost, 'id' | 'replies'>) => {
        try {
            const resp = await fetch(`${API_URL}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) });
            if (!resp.ok) throw new Error('post-failed');
            const saved = await resp.json();
            setPosts(prev => [saved as ForumPost, ...prev]);
            showToast('Post created successfully!', 'success');
        } catch {
            showToast('Failed to create post.', 'error');
        }
    };

    const addReply = async (postId: number, replyData: Omit<CommunityReply, 'id'>) => {
        try {
            const resp = await fetch(`${API_URL}/posts/${postId}/replies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(replyData) });
            if (!resp.ok) throw new Error('reply-failed');
            const saved = await resp.json();
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: [...(p.replies || []), saved as CommunityReply] } : p));
            showToast('Reply posted!', 'success');
        } catch {
            showToast('Failed to post reply.', 'error');
        }
    };

    const value = useMemo(() => ({ posts, addPost, addReply }), [posts]);

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
