import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

// Component wrapper for easier use
import React from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'fade';
  delay?: number;
  duration?: number;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
}

export function ScrollReveal({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  duration = 600,
  threshold = 0.1,
  as: Component = 'div'
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold });

  const getAnimationStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      transitionDelay: `${delay}ms`,
    };

    if (!isVisible) {
      switch (animation) {
        case 'fade-up':
          return { ...baseStyles, opacity: 0, transform: 'translateY(40px)' };
        case 'fade-down':
          return { ...baseStyles, opacity: 0, transform: 'translateY(-40px)' };
        case 'fade-left':
          return { ...baseStyles, opacity: 0, transform: 'translateX(40px)' };
        case 'fade-right':
          return { ...baseStyles, opacity: 0, transform: 'translateX(-40px)' };
        case 'scale':
          return { ...baseStyles, opacity: 0, transform: 'scale(0.9)' };
        case 'fade':
        default:
          return { ...baseStyles, opacity: 0 };
      }
    }

    return { ...baseStyles, opacity: 1, transform: 'none' };
  };

  return React.createElement(
    Component,
    {
      ref,
      className,
      style: getAnimationStyles(),
    },
    children
  );
}
