// REACT NATIVE MIGRATION NOTE:
// This component uses a standard HTML <button> element with Tailwind CSS.
// In the React Native version, you would replace this with a component from
// your chosen UI library, 'React Native Paper', as specified in your project plan.
//
// Example using React Native Paper:
//
// import { Button as PaperButton } from 'react-native-paper';
//
// const Button = ({ children, variant = 'primary', ...props }) => (
//   <PaperButton
//     mode={variant === 'primary' ? 'contained' : 'outlined'}
//     {...props}
//   >
//     {children}
//   </PaperButton>
// );

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
    const baseClasses = 'w-full font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark',
        secondary: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;