import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useCommunity } from '../context/CommunityContext';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import { ForumPost, CommunityReply, UserRole } from '../types';

// Utility to format ISO timestamp to human readable format
const formatDate = (isoString: string) => {
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return isoString;
    }
};

const PostCard: React.FC<{ post: ForumPost, onClick: () => void }> = ({ post, onClick }) => {
    const { allUsers } = useAuth();
    const author = allUsers.find(u => u.id === post.authorId);
    const { t } = useLanguage();
    return (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary cursor-pointer transition-colors shadow-sm" onClick={onClick}>
            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{post.title}</h3>
            <div className="text-xs text-neutral-500 mt-1 flex justify-between">
                <span className="dark:text-neutral-400">By {author?.name || 'Anonymous'} - {formatDate(post.timestamp)}</span>
                <span className="dark:text-neutral-400">{post.replies.length} {t('replies')}</span>
            </div>
        </div>
    );
}

const ReplyCard: React.FC<{ reply: CommunityReply, postId: number }> = ({ reply, postId }) => {
    const { allUsers, user } = useAuth();
    const { deleteReply } = useCommunity();
    const author = allUsers.find(u => u.id === reply.authorId);
    const canDelete = String(user?.id) === String(reply.authorId) || user?.role === UserRole.Admin;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this reply?')) {
            deleteReply(postId, reply.id);
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-sm border border-neutral-100 dark:border-neutral-700">
            <div className="flex justify-between text-xs mb-1">
                <div className="flex items-center space-x-2">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-100">{author?.name || 'Anonymous'}</span>
                    <span className="text-neutral-500 dark:text-neutral-400">{formatDate(reply.timestamp)}</span>
                </div>
                {canDelete && (
                    <button onClick={handleDelete} className="text-red-500 hover:text-red-700 dark:text-red-400">
                        Delete
                    </button>
                )}
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 text-sm">{reply.content}</p>
        </div>
    )
}

const PostDetailView: React.FC<{ post: ForumPost, onBack: () => void }> = ({ post, onBack }) => {
    const { user } = useAuth();
    const { addReply, deletePost } = useCommunity();
    const { t } = useLanguage();
    const [newReply, setNewReply] = useState('');
    const { allUsers } = useAuth();
    const author = allUsers.find(u => u.id === post.authorId);
    const isAuthorOrAdmin = String(user?.id) === String(post.authorId) || user?.role === UserRole.Admin;

    const handleReplySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReply.trim() || !user) return;

        addReply(post.id, {
            authorId: user.id,
            content: newReply
        });
        setNewReply('');
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this post? All replies will also be deleted.')) {
            deletePost(post.id);
            onBack();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-green-50 dark:bg-neutral-900">
            <Header title={post.title} onBack={onBack}>
                {isAuthorOrAdmin && (
                    <button
                        onClick={handleDelete}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                        title="Delete post"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </Header>
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                        Posted by {author?.name || 'Anonymous'} on {formatDate(post.timestamp)}
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300">{post.content}</p>
                </div>

                <h3 className="font-bold text-neutral-800 dark:text-neutral-100 pt-4 border-t dark:border-neutral-700">{t('replies')} ({post.replies.length})</h3>
                <div className="space-y-3">
                    {post.replies.map(reply => (
                        <ReplyCard key={reply.id} reply={reply} postId={post.id} />
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
                    <Button type="submit" className="!w-auto !px-3 !py-1 !text-xs">{t('reply')}</Button>
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
            content
        });
        setTitle('');
        setContent('');
        setShowForm(false);
    };

    if (selectedPost) {
        return <PostDetailView post={selectedPost} onBack={() => setSelectedPost(null)} />;
    }

    return (
        <div className="min-h-screen bg-green-50 dark:bg-neutral-900 dark:text-neutral-200">
            <Header title={t('communityForum')} onBack={goBack} />
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{t('discussions')}</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm flex items-center space-x-1"
                    >
                        <span>+</span>
                        <span>{showForm ? t('cancel') : t('newPost')}</span>
                    </button>
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
                            <Button type="submit" className="!w-auto !px-3 !py-1 !text-xs">{t('post')}</Button>
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
