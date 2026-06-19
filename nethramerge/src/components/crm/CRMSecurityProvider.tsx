import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCRMPermissions } from "@/hooks/useCRMPermissions";
import { useAuth } from "@/hooks/useAuth";
import { logCRMAction } from "@/services/crmAudit";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isMobileOrTablet } from "@/utils/device";
import "@/pages/crm/crm-security.css";

const WatermarkOverlay = ({ profile }: { profile: any }) => {
    if (!profile) return null;
    
    const text = `${profile.full_name || profile.email || 'Unknown User'} - ${new Date().toLocaleDateString()}`;
    
    // Create an array of 200 items to fill the screen
    const items = Array.from({ length: 200 });
    
    return (
        <div style={{
            position: 'fixed',
            top: '-50%',
            left: '-50%',
            width: '200vw',
            height: '200vh',
            pointerEvents: 'none',
            zIndex: 99999,
            overflow: 'hidden',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignContent: 'center',
            opacity: 0, // completely invisible
            userSelect: 'none',
            mixBlendMode: 'difference' // Helps it stand out when contrast is edited
        }}>
            {items.map((_, i) => (
                <div key={i} style={{ 
                    transform: 'rotate(-30deg)', 
                    fontSize: '18px', 
                    color: '#fff', 
                    padding: '2rem 4rem', 
                    whiteSpace: 'nowrap', 
                    fontWeight: 'bold',
                    fontFamily: 'monospace'
                }}>
                    {text}
                </div>
            ))}
        </div>
    );
};

export const CRMSecurityProvider = ({ children }: { children: React.ReactNode }) => {
    const { isPrivileged, isLoading: isLoadingPermissions } = useCRMPermissions();
    const { profile } = useAuth();
    const [isShielded, setIsShielded] = useState(false);
    const [protectionEnabled, setProtectionEnabled] = useState(false);
    const location = useLocation();
    const lastFocusRef = useRef<boolean>(true);

    // Fetch and subscribe to security settings
    useEffect(() => {
        if (!profile?.company_id) return;

        const fetchSettings = async () => {
            const { data } = await supabase
                .from("security_settings")
                .select("screenshot_protection")
                .eq("company_id", profile.company_id)
                .maybeSingle();
            
            if (data) {
                setProtectionEnabled(!!data.screenshot_protection);
            }
        };

        fetchSettings();

        const channel = supabase
            .channel('security-settings-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'security_settings', filter: `company_id=eq.${profile.company_id}` },
                (payload) => {
                    if (payload.new && 'screenshot_protection' in payload.new) {
                        setProtectionEnabled(!!payload.new.screenshot_protection);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.company_id]);

    useEffect(() => {
        const isCRMRoute = location.pathname.startsWith("/crm") ||
            location.pathname.startsWith("/system/integrations/zoho") ||
            location.pathname.startsWith("/system/mailbox");

        // EXEMPTIONS: Admins/Managers, Non-CRM Routes, or if Protection is toggled OFF in DB, or on Mobile/Tablet
        if (true || isLoadingPermissions || !isCRMRoute || isPrivileged || !protectionEnabled || isMobileOrTablet()) {
            setIsShielded(false);
            document.body.classList.remove('lockdown-active');
            return;
        }

        const triggerShield = () => {
            if (!isShielded) {
                setIsShielded(true);
                document.body.classList.add('lockdown-active');
                
                // Log to DB via standard audit log instead of just console
                supabase.from("audit_logs").insert({
                    user_id: profile?.id,
                    action: "Security Lockdown Triggered (Screenshot/Blur Detected)",
                    resource_type: "security",
                    user_agent: navigator.userAgent,
                    status: "Blocked"
                }).then(() => {});
                
                logCRMAction('NUCLEAR_BLOCK_SUCCESS', 0);
            }
        };

        const removeShield = () => {
            setIsShielded(false);
            document.body.classList.remove('lockdown-active');
        };

        // NUCLEAR FOCUS WATCHER (60 frames per second)
        const checkFocus = () => {
            const hasFocus = document.hasFocus();
            if (!hasFocus && lastFocusRef.current) {
                triggerShield();
            }
            lastFocusRef.current = hasFocus;
            requestAnimationFrame(checkFocus);
        };
        const frameId = requestAnimationFrame(checkFocus);

        const handleKeyDown = (e: KeyboardEvent) => {
            // DETECT ALL LOCKDOWN KEYS
            if (
                e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44 ||
                e.key === "Meta" || e.code === "MetaLeft" || e.code === "MetaRight" ||
                e.keyCode === 91 || e.keyCode === 92 || // Windows Keys
                ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "s" || e.key === "i" || e.key === "u" || e.key === "c")) ||
                e.key === "F12"
            ) {
                e.preventDefault();
                e.stopPropagation();
                triggerShield();
                setTimeout(removeShield, 5000);
            }
        };

        // Listeners
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyDown, true);
        window.addEventListener('blur', triggerShield);
        window.addEventListener('focus', removeShield);
        window.addEventListener('beforeprint', triggerShield);
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') triggerShield();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Mouse Exit Detection (Screenshot tools usually move the mouse out of window)
        document.addEventListener('mouseleave', triggerShield);
        document.addEventListener('mouseenter', removeShield);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('keyup', handleKeyDown, true);
            window.removeEventListener('blur', triggerShield);
            window.removeEventListener('focus', removeShield);
            window.removeEventListener('beforeprint', triggerShield);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('mouseleave', triggerShield);
            document.removeEventListener('mouseenter', removeShield);
            document.body.classList.remove('lockdown-active');
        };
    }, [location.pathname, isPrivileged, isLoadingPermissions, isShielded, protectionEnabled, profile?.id]);

    return (
        <div className={isShielded ? 'shield-active' : ''}>
            {/* INVISIBLE WATERMARK - TEMPORARILY VISIBLE TO ADMINS FOR DEMO */}
            {/* {protectionEnabled && (
                <WatermarkOverlay profile={profile} />
            )} */}

            <div className="privacy-shield">
                <div className="shield-message">
                    <ShieldAlert className="h-32 w-32 text-red-600 mb-6 mx-auto" />
                    <h2 className="text-4xl font-black text-white mb-4">SYSTEM LOCKDOWN</h2>
                    <p className="text-xl text-red-600 font-bold uppercase tracking-widest">
                        UNAUTHORIZED CAPTURE BLOCKED
                    </p>
                    <div className="mt-8 p-6 bg-red-900/10 border border-red-900/50 text-gray-400">
                        CRM Data is under real-time hardware protection.
                        Any attempt to record, save, or snapshot this screen
                        triggers an immediate blackout and administrative alert.
                    </div>
                </div>
            </div>

            <div className="crm-protected-content">
                {children}
            </div>
        </div>
    );
};
