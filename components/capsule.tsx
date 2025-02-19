"use client";

import React from 'react';

interface CapsuleProps {
  text: string;
  bgColor?: string;
  textColor?: string;
  showIcon?: string;
}

export const Capsule: React.FC<CapsuleProps> = ({ 
  text, 
  bgColor = 'bg-green-100',
  textColor = 'text-green-700',
  showIcon = 'ok' 
}) => {
  return (
    <span className={`px-3 py-1 text-sm font-medium ${bgColor} ${textColor} rounded-full inline-flex items-center`}>
      {showIcon && (
        showIcon === 'ok' ? (
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
          </svg>
        ) : (
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        )
      )}
      {text}
    </span>
  );
};
