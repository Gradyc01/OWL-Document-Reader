import LoadingSpinner from "./LoadingSpinner";

interface LoadingOverlayProps {
    loading: boolean;
}

const LoadingOverlay = ({ loading }: LoadingOverlayProps) => {
    return (
        <div
            className={
                "fixed z-10 flex h-screen w-screen items-center justify-center justify-items-center bg-black/40 transition-opacity duration-400" +
                (loading ? " opacity-100" : " pointer-events-none opacity-0")
            }
        >
            <LoadingSpinner />
        </div>
    );
};

export default LoadingOverlay;