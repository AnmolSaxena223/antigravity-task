import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hoverable = false }) => {
  return (
    <div
      className={`glass-card ${hoverable ? 'glass-card-hover' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassCard;
