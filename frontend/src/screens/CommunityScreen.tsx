

import React, { useState } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Button from '../components/Button';
import Input from '../components/Input';
import { ForumPost, CommunityReply } from '../types';
import { useLanguage } from '../context/LanguageContext';

const PostCard: React.FC<{post: ForumPost, onClick: () => void}> = ({ post, onClick }) => {
    const { allUsers } = useAuth();
    const { t } = useLanguage();
    const author = allUsers.find(u => u.id === post.authorId);
    return (
        <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 hover:border-primary cursor-pointer transition-colors" onClick={onClick}>
            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{post.title}</h3>
            <div className="text-xs text-neutral-500 mt-1 flex justify-between">
                <span className="dark:text-neutral-400">{t('postedBy', { name: author?.name || 'Anonymous' })} - {post.timestamp}</span>
                <span className="dark:text-neutral-400">{post.replies.length} {t('replies')}</span>
            </div>
        </div>
    );
}

const ReplyCard: React.FC<{reply: CommunityReply}> = ({ reply }) => {
    const { allUsers } = useAuth();
    const { t } = useLanguage();
    const author = allUsers.find(u => u.id === reply.authorId);
    return (
        <div className="bg-neutral-100 dark:bg-neutral-700 p-3 rounded-lg">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{author?.name || 'Anonymous'}</span>
                <span className="text-neutral-500 dark:text-neutral-400">{reply.timestamp}</span>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 text-sm">{reply.content}</p>
        </div>
    )
}

const PostDetailView: React.FC<{ post: ForumPost, onBack: () => void }> = ({ post, onBack }) => {
    const { user, allUsers } = useAuth();
    const { addReply } = useCommunity();
    const { t } = useLanguage();
    const [newReply, setNewReply] = useState('');
    const author = allUsers.find(u => u.id === post.authorId);

    const handleReplySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReply.trim() || !user) return;

        addReply(post.id, {
            authorId: user.id,
            content: newReply,
        });
        setNewReply('');
    };

    return (
        <div className="flex flex-col h-full">
            <Header title={post.title} onBack={onBack} />
            <div className="flex-grow overflow-y-auto p-4 space-y-4 hide-scrollbar">
                 <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                        {t('postedBy', { name: author?.name || 'Anonymous' })} {t('on')} {post.timestamp}
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300">{post.content}</p>
                </div>

                <h3 className="font-bold text-neutral-800 dark:text-neutral-100 pt-4 border-t dark:border-neutral-700">{t('replies')} ({post.replies.length})</h3>
                <div className="space-y-3">
                    {post.replies.map(reply => (
                        <ReplyCard key={reply.id} reply={reply} />
                    ))}
                </div>
            </div>
             <div className="p-4 bg-white dark:bg-neutral-800 border-t dark:border-neutral-700">
                <form onSubmit={handleReplySubmit} className="flex space-x-2">
                    <input
                        type="text"
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        placeholder={t('writeAReply')}
                        className="flex-grow p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white"
                    />
                    <Button type="submit" className="w-auto px-6">{t('reply')}</Button>
                </form>
            </div>
        </div>
    );
};

const CommunityScreen: React.FC<{ goBack?: () => void }> = ({ goBack }) => {
    const { posts, addPost } = useCommunity();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !user) return;
        addPost({
            authorId: user.id,
            title,
            content,
        });
        setTitle('');
        setContent('');
        setShowForm(false);
    };

    if (selectedPost) {
        return <PostDetailView post={selectedPost} onBack={() => setSelectedPost(null)} />;
    }

    return (
        <div className="dark:text-neutral-200">
            <Header title={t('communityForum')} onBack={goBack} />
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{t('discussions')}</h2>
                    <Button onClick={() => setShowForm(!showForm)} className="w-auto px-4 py-2 text-sm">{showForm ? t('cancel') : `+ ${t('newPost')}`}</Button>
                </div>
                
                {showForm && (
                    <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 mb-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{t('createANewPost')}</h3>
                            <Input label={t('title')} value={title} onChange={e => setTitle(e.target.value)} required />
                            <div>
                               <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('content')}</label>
                               <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} required className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <Button type="submit">{t('post')}</Button>
                        </form>
                    </div>
                )}

                <div className="space-y-3">
                    {posts.map(post => (
                        <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommunityScreen;
