import { SylvaLivingWorldScene } from '@designcodeio/threeui';
import '@designcodeio/threeui/style.css';

/**
 * Full-viewport 3D mossy forest background from ThreeUI.
 * Place inside a relative container to render as that container's background.
 * No buttons, cards, or UI — just the animated scene.
 */
export default function SylvaBackground() {
    return (
        <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
        >
            <SylvaLivingWorldScene
                className="w-full h-full"
                style={{ position: 'absolute', inset: 0 }}
            />
            {/* Subtle vignette edges to blend scene into page — much lighter than before */}
            <div
                className="absolute inset-0 z-10"
                style={{
                    background: 'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(248,249,246,0.3) 75%, rgba(248,249,246,0.85) 100%)',
                }}
            />
            {/* Bottom fade into page background */}
            <div
                className="absolute bottom-0 left-0 right-0 h-[30%] z-10"
                style={{
                    background: 'linear-gradient(to top, rgba(248,249,246,1) 0%, rgba(248,249,246,0.6) 40%, transparent 100%)',
                }}
            />
        </div>
    );
}
