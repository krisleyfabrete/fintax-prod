import React from 'react';
import './FeatureCard3D.css';

interface FeatureCard3DProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function FeatureCard3D({ icon, title, description }: FeatureCard3DProps) {
  return (
    <div className="feature-card-parent">
      <div className="feature-card">
        <div className="feature-card-logo">
          <span className="feature-circle feature-circle1"></span>
          <span className="feature-circle feature-circle2"></span>
          <span className="feature-circle feature-circle3"></span>
          <span className="feature-circle feature-circle4"></span>
          <span className="feature-circle feature-circle5">
            <span className="feature-circle-icon">{icon}</span>
          </span>
        </div>
        <div className="feature-card-glass"></div>
        <div className="feature-card-content">
          <span className="feature-card-title">{title}</span>
          <span className="feature-card-text">{description}</span>
        </div>

      </div>
    </div>
  );
}
