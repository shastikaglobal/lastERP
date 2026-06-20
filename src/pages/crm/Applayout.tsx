// src/components/layout/AppLayout.tsx
// உங்க existing AppLayout-ல் இந்த மூன்று lines மட்டும் add பண்ணுங்க

import { Outlet, useLocation } from "react-router-dom";
import { useActivityTracker } from "@/hooks/useActivityTracker";
// ... உங்க existing imports

export default function AppLayout() {
    const location = useLocation();

    // ← இந்த ஒரு line மட்டும் add பண்ணுங்க — எல்லா pages-லயும் auto track ஆகும்
    useActivityTracker(location.pathname);

    return (
        // உங்க existing JSX unchanged
        <div>
            {/* Topbar, Sidebar etc */}
            <Outlet />
        </div>
    );
}