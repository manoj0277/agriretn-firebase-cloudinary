import React from 'react';

export const AppSkeleton: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-neutral-900 overflow-hidden">
            {/* Sidebar Skeleton - Hidden on mobile, visible on md */}
            <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
                <div className="flex flex-col flex-grow bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto">
                    <div className="flex items-center h-16 flex-shrink-0 px-4 bg-green-700">
                        <div className="h-8 w-8 bg-green-600 rounded animate-pulse mr-2"></div>
                        <div className="h-6 w-32 bg-green-600 rounded animate-pulse"></div>
                    </div>
                    <div className="flex-1 flex flex-col p-4 space-y-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center space-x-3">
                                <div className="h-6 w-6 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                                <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex flex-col flex-1 w-0 overflow-hidden md:pl-64">
                {/* Header Skeleton */}
                <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-neutral-800 shadow border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex-1 px-4 flex justify-between items-center">
                        <div className="h-6 w-32 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 dark:bg-neutral-700 rounded-full animate-pulse"></div>
                    </div>
                </div>

                <main className="flex-1 relative overflow-y-auto focus:outline-none p-4">
                    {/* Dashboard Cards Skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow space-y-2">
                                <div className="h-4 w-20 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                                <div className="h-8 w-16 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>

                    {/* List Skeleton */}
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 space-y-4">
                        <div className="h-6 w-48 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse mb-4"></div>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center space-x-4 border-b border-neutral-100 dark:border-neutral-700 pb-4 last:border-0 last:pb-0">
                                <div className="h-12 w-12 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Bottom Nav Skeleton - Mobile Only */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 h-16 px-6 flex justify-between items-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-8 w-8 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        </div>
    );
};
