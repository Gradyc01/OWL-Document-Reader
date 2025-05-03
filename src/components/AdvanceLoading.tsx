import { useEffect, useRef, useState } from "react";

interface LoadingOverlayProps {
    loading: boolean;
    message?: string;
    lower_limit_frac: number; // between 0 and 1
    upper_limit_frac: number; // between 0 and 1
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const LoadingOverlay = ({
    loading,
    message,
    lower_limit_frac,
    upper_limit_frac,
}: LoadingOverlayProps) => {
    const [progress, setProgress] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!loading) {
            setProgress(0);
            return;
        }

        const start = clamp(lower_limit_frac, 0, 1);
        const end = clamp(upper_limit_frac, start, 1);
        let current = start;

        const animate = () => {
            const distance = end - current;
            if (distance > 0.001) {
                // Ease out effect
                current += distance * 0.002; // This multiplier can control the speed. You can dynamically change it with a variable.
                setProgress(current);
                rafRef.current = requestAnimationFrame(animate);
            } else {
                setProgress(end);
            }
        };

        setProgress(start);
        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [loading, lower_limit_frac, upper_limit_frac]);

    return (
        <div
            className={
                "fixed z-10 flex h-screen w-screen items-center justify-center bg-black/40 transition-opacity duration-400" +
                (loading ? " opacity-100" : " pointer-events-none opacity-0")
            }
        >
            <div className="flex flex-col items-center gap-4 w-3/4 max-w-md px-4">
                {message && <div className="text-white text-lg text-center">{message}</div>}
                <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-100"
                        style={{ width: `${(progress * 100).toFixed(2)}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
