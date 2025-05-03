const Spinner = () => {
    return (
        <div
            className="h-12 w-12 animate-[spin_1s_ease_infinite_normal] rounded-full border-[0.45em] border-current border-b-transparent border-l-transparent border-r-transparent opacity-80"
            role="status"
        />
    );
};

export default Spinner;