import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps {
    children: React.ReactNode;
    container?: string | React.RefObject<HTMLElement>;
    distance?: number;
    direction?: 'vertical' | 'horizontal';
    reverse?: boolean;
    duration?: number;
    ease?: string;
    initialOpacity?: number;
    animateOpacity?: boolean;
    scale?: number;
    threshold?: number;
    delay?: number;
    disappearAfter?: number;
    disappearDuration?: number;
    disappearEase?: string;
    onComplete?: () => void;
    onDisappearanceComplete?: () => void;
    className?: string;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
    children,
    container,
    distance = 100,
    direction = 'vertical',
    reverse = false,
    duration = 0.8,
    ease = 'power3.out',
    initialOpacity = 0,
    animateOpacity = true,
    scale = 1,
    threshold = 0.1,
    delay = 0,
    disappearAfter = 0,
    disappearDuration = 0.5,
    disappearEase = 'power3.in',
    onComplete,
    onDisappearanceComplete,
    className = '',
    ...props
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let scrollerTarget: Element | Window | null = null;
        if (container) {
            if (typeof container === 'string') {
                scrollerTarget = document.querySelector(container);
            } else if ('current' in container) {
                scrollerTarget = container.current;
            } else {
                scrollerTarget = container as unknown as Element;
            }
        }

        const axis = direction === 'horizontal' ? 'x' : 'y';
        const offset = reverse ? -distance : distance;
        const startPct = (1 - threshold) * 100;

        gsap.set(el, {
            [axis]: offset,
            scale,
            opacity: animateOpacity ? initialOpacity : 1,
        });

        const tl = gsap.timeline({
            paused: true,
            delay,
            onComplete: () => {
                onComplete?.();
                if (disappearAfter > 0) {
                    gsap.to(el, {
                        [axis]: reverse ? distance : -distance,
                        scale: 0.8,
                        opacity: animateOpacity ? initialOpacity : 0,
                        delay: disappearAfter,
                        duration: disappearDuration,
                        ease: disappearEase,
                        onComplete: () => onDisappearanceComplete?.()
                    });
                }
            }
        });

        tl.to(el, {
            [axis]: 0,
            scale: 1,
            opacity: 1,
            duration,
            ease
        });

        const st = ScrollTrigger.create({
            trigger: el,
            scroller: scrollerTarget as any,
            start: `top ${startPct}%`,
            once: true,
            onEnter: () => tl.play()
        });

        return () => {
            st.kill();
            tl.kill();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div ref={ref} className={className} {...props}>
            {children}
        </div>
    );
};

export default AnimatedContent;
