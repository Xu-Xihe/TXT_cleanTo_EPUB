import { useEffect, useState } from "react";
import "./success.css";

export default function AppleSuccess() {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setAnimate(true));
    }, []);

    return (
        <div
            className="success-overlay"
            onClick={() => animate && window.location.reload()}
        >
            <div className={`success-card ${animate ? "show" : ""}`}>
                <svg viewBox="0 0 56 56" className="success-icon">
                    <circle cx="28" cy="28" r="25" className="circle" />
                    <path d="M16 29 L24 37 L40 20" className="check" />
                </svg>

                <div className="title">成功</div>
                <div className="subtitle">点击任意位置返回</div>
            </div>
        </div>
    );
}