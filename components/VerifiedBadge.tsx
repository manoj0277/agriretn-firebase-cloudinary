import React from 'react';

interface VerifiedBadgeProps {
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

/**
 * Verified Account Badge - Shows a verified checkmark icon
 * Display beside supplier names to indicate verified/premium status
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 'md', showTooltip = true }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    return (
        <span
            className="inline-flex items-center"
            title={showTooltip ? 'Verified Account - Premium Supplier' : undefined}
        >
            <svg
                className={`${sizeClasses[size]} text-blue-500`}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                {/* Verified checkmark with badge */}
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#3B82F6" opacity="0.2" />
                <path d="M12 2L14.39 5.42L18.5 5.25L17.39 10L20.5 12L17.39 14L18.5 18.75L14.39 18.58L12 22L9.61 18.58L5.5 18.75L6.61 14L3.5 12L6.61 10L5.5 5.25L9.61 5.42L12 2Z" fill="#3B82F6" />
                <path d="M10.5 14.5L8 12L9.41 10.59L10.5 11.67L14.59 7.59L16 9L10.5 14.5Z" fill="white" />
            </svg>
        </span>
    );
};

export default VerifiedBadge;
