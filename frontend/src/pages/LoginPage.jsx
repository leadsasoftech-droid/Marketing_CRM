import { useState, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion, useMotionValue, useTransform } from "framer-motion";

const Mascot = ({ isPasswordFocused, showPassword, isEmailFocused, emailLength, isAngry }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        if (isEmailFocused) {
            // When typing email, look down, and pan right based on text length
            const targetX = -4 + Math.min(emailLength, 30) * 0.3;
            mouseX.set(targetX);
            mouseY.set(5); // Look slightly down towards the input
            return;
        }

        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;
            const centerX = window.innerWidth / 2;
            const centerY = (window.innerHeight / 2) - 150;

            let dx = (clientX - centerX) / (window.innerWidth / 2);
            let dy = (clientY - centerY) / (window.innerHeight / 2);

            mouseX.set(dx * 4); // Clamped tightly to 4px
            mouseY.set(dy * 4);
        };

        const handleMouseLeave = () => {
            if (!isEmailFocused) {
                mouseX.set(0);
                mouseY.set(0);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [mouseX, mouseY, isEmailFocused, emailLength]);

    // Spring animation for eyes
    const eyeX = useTransform(mouseX, (v) => v);
    const eyeY = useTransform(mouseY, (v) => v);

    const isCoveringEyes = isPasswordFocused && !showPassword;

    return (
        <div className="relative w-48 h-36 mx-auto -mt-4 mb-8 z-10 select-none">
            {/* The Mascot Body */}
            <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-md">

                {/* --- Floating Marketing Icons (Background) --- */}
                {/* Target (Top Right) */}
                <g transform="translate(180, 20) scale(0.8)">
                    <motion.g animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                        <circle cx="15" cy="15" r="15" fill="#fbd38d" />
                        <circle cx="15" cy="15" r="10" fill="#f6ad55" />
                        <circle cx="15" cy="15" r="5" fill="#dd6b20" />
                        <path d="M 15 15 L 30 0 M 25 0 L 30 0 L 30 5" fill="none" stroke="#dd6b20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.g>
                </g>

                {/* Megaphone (Top Left) */}
                <g transform="translate(25, 30) scale(0.8) rotate(-15)">
                    <motion.g animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
                        <path d="M 0 10 L 20 0 L 20 20 Z" fill="#63b3ed" />
                        <rect x="20" y="0" width="5" height="20" fill="#4299e1" />
                        <path d="M 5 20 L 10 30 L 15 20 Z" fill="#a0aec0" />
                        <path d="M 28 5 Q 35 10 28 15 M 32 0 Q 42 10 32 20" fill="none" stroke="#4299e1" strokeWidth="2" strokeLinecap="round" />
                    </motion.g>
                </g>

                {/* Envelope (Mid Right) */}
                <g transform="translate(195, 75) scale(0.7) rotate(10)">
                    <motion.g animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
                        <rect x="0" y="0" width="24" height="16" rx="2" fill="#fff" stroke="#f6ad55" strokeWidth="2" />
                        <path d="M 0 0 L 12 8 L 24 0" fill="none" stroke="#f6ad55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.g>
                </g>

                {/* Chart (Mid Left) */}
                <g transform="translate(35, 80) scale(0.7) rotate(-5)">
                    <motion.g animate={{ y: [0, -7, 0], rotate: [0, 5, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>
                        <rect x="0" y="0" width="20" height="20" rx="2" fill="#fff" stroke="#4299e1" strokeWidth="2" />
                        <rect x="4" y="10" width="4" height="10" fill="#eb8c8c" />
                        <rect x="12" y="4" width="4" height="16" fill="#4299e1" />
                    </motion.g>
                </g>

                {/* Long Back Hair */}
                <path d="M 120 15 C 60 15, 50 80, 50 200 L 190 200 C 190 80, 180 15, 120 15 Z" fill="#4a3f35" />

                {/* Blazer/Body */}
                <path d="M 50 200 C 50 130, 80 120, 120 120 C 160 120, 190 130, 190 200 Z" fill="#f6ad55" />

                {/* Shirt & Collar */}
                <path d="M 100 125 L 120 160 L 140 125 Z" fill="#2d3748" />
                <path d="M 100 125 L 120 145 L 90 145 Z" fill="#fbd38d" />
                <path d="M 140 125 L 120 145 L 150 145 Z" fill="#fbd38d" />
                {/* Neck */}
                <rect x="105" y="100" width="30" height="30" fill="#fbd38d" />
                <path d="M 105 115 Q 120 125 135 115 L 135 130 L 105 130 Z" fill="#f6ad55" opacity="0.5" />

                {/* Head */}
                <circle cx="120" cy="70" r="40" fill="#fbd38d" />

                {/* Hair Top / Bangs */}
                <path d="M 120 20 C 70 20, 60 60, 60 100 C 70 60, 90 40, 120 45 C 150 40, 170 60, 180 100 C 180 60, 170 20, 120 20 Z" fill="#3e2723" />
                <path d="M 120 15 C 90 15, 70 40, 65 80 C 80 50, 100 40, 120 45 C 140 40, 160 50, 175 80 C 170 40, 150 15, 120 15 Z" fill="#2d2620" />

                {/* Ears */}
                <path d="M 80 70 A 10 12 0 1 0 80 90" fill="#fbd38d" />
                <path d="M 160 70 A 10 12 0 1 1 160 90" fill="#fbd38d" />

                {/* Earrings */}
                <circle cx="77" cy="88" r="3" fill="#e2e8f0" />
                <circle cx="163" cy="88" r="3" fill="#e2e8f0" />

                {/* Cheeks */}
                <circle cx="95" cy="85" r="6" fill={isAngry ? "#e53e3e" : "#f6ad55"} opacity={isAngry ? "0.8" : "0.6"} />
                <circle cx="145" cy="85" r="6" fill={isAngry ? "#e53e3e" : "#f6ad55"} opacity={isAngry ? "0.8" : "0.6"} />

                {/* Nose */}
                <path d="M 120 75 L 117 85 L 123 85 Z" fill="#ed8936" opacity="0.8" />

                {/* Smile / Mouth */}
                {isAngry ? (
                    <path d="M 110 98 Q 120 92 130 98" fill="none" stroke="#dd6b20" strokeWidth="2.5" strokeLinecap="round" />
                ) : (
                    <path d="M 108 94 Q 120 102 132 94" fill="none" stroke="#dd6b20" strokeWidth="2.5" strokeLinecap="round" />
                )}

                {/* Eyebrows */}
                {isAngry ? (
                    <>
                        <path d="M 94 45 L 110 52" fill="none" stroke="#3e2723" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 146 45 L 130 52" fill="none" stroke="#3e2723" strokeWidth="3" strokeLinecap="round" />
                    </>
                ) : (
                    <>
                        <path d="M 94 50 Q 102 46 110 50" fill="none" stroke="#3e2723" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 130 50 Q 138 46 146 50" fill="none" stroke="#3e2723" strokeWidth="2.5" strokeLinecap="round" />
                    </>
                )}

                {/* Eyes - Dynamic */}
                {/* Left Eye Base */}
                <circle cx="102" cy="65" r="10" fill="#ffffff" />
                {/* Right Eye Base */}
                <circle cx="138" cy="65" r="10" fill="#ffffff" />

                {/* Moving Pupils */}
                <motion.g style={{ x: isCoveringEyes ? 0 : eyeX, y: isCoveringEyes ? 0 : eyeY }}>
                    <circle cx="102" cy="65" r="4.5" fill="#5c4033" />
                    <circle cx="138" cy="65" r="4.5" fill="#5c4033" />
                    {/* Cute pupil glint */}
                    <circle cx="100.5" cy="63.5" r="1.5" fill="#ffffff" />
                    <circle cx="136.5" cy="63.5" r="1.5" fill="#ffffff" />
                </motion.g>

                {/* Animated Laptop that covers her face */}
                <motion.g
                    initial={false}
                    animate={{ y: isCoveringEyes ? -50 : 30, scale: isCoveringEyes ? 1.05 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    {/* Laptop Screen Back */}
                    <rect x="55" y="105" width="130" height="85" rx="5" fill="#718096" />
                    {/* Laptop Base */}
                    <path d="M 35 190 L 205 190 L 195 200 L 45 200 Z" fill="#4a5568" />

                    {/* App Logo on laptop */}
                    <image href="/favicon.png" x="108" y="135.5" width="24" height="24" opacity="0.85" />

                    {/* Hands holding the sides of the laptop */}
                    {/* Left Hand */}
                    <ellipse cx="55" cy="180" rx="14" ry="10" fill="#fbd38d" transform="rotate(-20 55 180)" />
                    <path d="M 45 175 C 50 173, 60 173, 65 175" fill="none" stroke="#f6ad55" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-20 55 180)" />

                    {/* Right Hand */}
                    <ellipse cx="185" cy="180" rx="14" ry="10" fill="#fbd38d" transform="rotate(20 185 180)" />
                    <path d="M 175 175 C 180 173, 190 173, 195 175" fill="none" stroke="#f6ad55" strokeWidth="1.5" strokeLinecap="round" transform="rotate(20 185 180)" />
                </motion.g>
            </svg>
        </div>
    );
};

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAngry, setIsAngry] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const { hasToken, isAuthenticated, isBootstrapping, login } = useAuth();

    const redirectTo = location.state?.from?.pathname || "/dashboard";

    if (hasToken && isBootstrapping) {
        return (
            <div className="bg-surface-container-low min-h-screen flex items-center justify-center p-6 font-sans">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-6 py-5 shadow-sm">
                    <p className="text-sm text-on-surface">Restoring your CRM session...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setIsAngry(false);

        try {
            await login({
                identifier,
                password,
            });

            navigate(redirectTo, { replace: true });
        } catch (error) {
            setIsAngry(true);
            toast.error(error.message || "Unable to sign in right now.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-surface-container-low min-h-screen flex items-center justify-center p-6 font-sans">
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-[0px_8px_24px_rgba(0,0,0,0.12)] border border-outline-variant overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 text-center flex flex-col items-center gap-3">
                    <img src="/siksapath.png" alt="Siksapath Logo" className="w-56 h-auto object-contain" />
                </div>

                {/* Mascot (Between Header and Form) */}
                <Mascot
                    isPasswordFocused={isPasswordFocused}
                    showPassword={showPassword}
                    isEmailFocused={isEmailFocused}
                    emailLength={identifier.length}
                    isAngry={isAngry}
                />

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6 flex flex-col gap-6">
                    {/* Email */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-on-surface-variant" htmlFor="email">
                            Email or User ID
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">person</span>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                required
                                value={identifier}
                                onChange={(event) => { setIdentifier(event.target.value); setIsAngry(false); }}
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => setIsEmailFocused(false)}
                                placeholder="Enter your email"
                                className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim transition-all text-sm text-on-surface outline-none placeholder:text-outline/60"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-on-surface-variant" htmlFor="password">
                                Password
                            </label>
                        </div>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">lock</span>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(event) => { setPassword(event.target.value); setIsAngry(false); }}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-10 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim transition-all text-sm text-on-surface outline-none placeholder:text-outline/60"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors focus:outline-none"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {showPassword ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-1 bg-primary text-on-primary py-3 px-6 rounded text-xs font-semibold hover:bg-primary-container transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-primary-fixed-dim focus:outline-none flex justify-center items-center gap-2"
                    >
                        <span>{isSubmitting ? 'Signing in...' : 'Login'}</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                </form>
            </motion.main>
        </div>
    );
}
