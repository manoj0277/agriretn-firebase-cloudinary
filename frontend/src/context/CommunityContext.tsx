import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { ForumPost, CommunityReply } from '../types';
import { useToast } from './ToastContext';
import { supabase } from '../../lib/supabase';

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
                const { data, error } = await supabase.from('forumPosts').select('*');
                if (error) throw error;
                setPosts((data || []) as ForumPost[]);
            } catch (error) {
                showToast('Could not load community posts.', 'error');
            }
        };
        fetchPosts();
    }, []);

    const addPost = async (postData: Omit<ForumPost, 'id' | 'replies' | 'timestamp'>) => {
        try {
            const newPost: ForumPost = { id: Date.now(), timestamp: new Date().toISOString(), replies: [], ...postData } as ForumPost;
            const { error } = await supabase.from('forumPosts').upsert([newPost]);
            if (error) throw error;
            setPosts(prev => [newPost, ...prev]);
            showToast('Post created successfully!', 'success');
        } catch (error) {
            showToast('Failed to create post.', 'error');
        }
    };

    const addReply = async (postId: number, replyData: Omit<CommunityReply, 'id' | 'timestamp'>) => {
        try {
            const newReply: CommunityReply = { id: Date.now(), timestamp: new Date().toISOString(), ...replyData } as CommunityReply;
            const { data } = await supabase.from('forumPosts').select('replies').eq('id', postId).limit(1);
            const existing = (data && data[0] && (data[0] as any).replies) || [];
            const updatedReplies = [...existing, newReply];
            const { error } = await supabase.from('forumPosts').update({ replies: updatedReplies }).eq('id', postId);
            if (error) throw error;
            setPosts(prev => prev.map(post => post.id === postId ? { ...post, replies: updatedReplies } : post));
            showToast('Reply posted!', 'success');
        } catch (error) {
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
