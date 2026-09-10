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
            {/* Gradient overlay to blend the scene into the page background */}
            <div
                className="absolute inset-0 z-10"
                style={{
                    background: 'linear-gradient(180deg, rgba(248,249,246,0.15) 0%, rgba(248,249,246,0.4) 40%, rgba(248,249,246,0.75) 70%, rgba(248,249,246,1) 90%)',
                }}
            />
        </div>
    );
}
