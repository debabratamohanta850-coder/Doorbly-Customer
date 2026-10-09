import React from 'react';

export const DOORBLY_OFFICIAL_LOGO_URL =
  'https://fktznwvrlsgmbrisyyac.supabase.co/storage/v1/object/sign/logo/logo%20(2).png?token=eyJraWQiOiJiMjQwZDFlOC0wZDVkLTQ1Y2EtYTdmYy1kNDllYWUyODljMGUiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJsb2dvL2xvZ28gKDIpLnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTE1MzIxMTQsImV4cCI6MTgyMzA2ODExNH0.ABIsTtzkPuMZ7yyS1uLDQ75vsiLkXKe__aH9tTqBLTdk2fCuI9EodNJ6PwH96sZ9rYfXlHxkdxy2jlqj8mLfIw';

interface Props {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact';
  alt?: string;
}

export const DoorblyLogo: React.FC<Props> = ({
  className = '',
  size = 'md',
  alt = 'Doorbly Official Company Logo'
}) => {
  // Calibrated sizes for the official company logo
  const sizeMap = {
    xs: 'h-6 w-auto max-w-[110px]',
    sm: 'h-8 w-auto max-w-[140px]',
    md: 'h-10 w-auto max-w-[170px]',
    lg: 'h-16 w-auto max-w-[220px]',
    xl: 'h-24 w-auto max-w-[280px]'
  };

  const chosenSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={DOORBLY_OFFICIAL_LOGO_URL}
        alt={alt}
        className={`${chosenSize} object-contain shrink-0 transition-opacity duration-200 drop-shadow-xs`}
        loading="eager"
      />
    </div>
  );
};
