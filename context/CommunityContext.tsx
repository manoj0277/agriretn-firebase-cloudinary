import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { ForumPost, CommunityReply } from '../types';
import { useToast } from './ToastContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface CommunityContextType {
    posts: ForumPost[];
    addPost: (post: Omit<ForumPost, 'id' | 'replies' | 'timestamp'>) => Promise<void>;
    addReply: (postId: number, reply: Omit<CommunityReply, 'id' | 'timestamp'>) => Promise<void>;
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
                const rows = (data || []) as ForumPost[];
                rows.sort((a, b) => (b.timestamp?.localeCompare?.(a.timestamp || '') || 0));
                setPosts(rows);
            } catch (error) {
                console.error(error);
                showToast('Could not load community posts.', 'error');
            }
        };
        fetchPosts();
    }, []);

    const addPost = async (postData: Omit<ForumPost, 'id' | 'replies' | 'timestamp'>) => {
        try {
            const response = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    const addReply = async (postId: number, replyData: Omit<CommunityReply, 'id' | 'timestamp'>) => {
        try {
            const response = await fetch(`${API_URL}/posts/${postId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
