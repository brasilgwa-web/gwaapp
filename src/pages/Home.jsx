import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function Home() {
    const navigate = useNavigate();

    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (user) {
            if (user.role === 'admin') {
                navigate('/Dashboard', { replace: true });
            } else {
                navigate('/visits', { replace: true });
            }
        } else {
            // If not logged in, maybe redirect to login? 
            // But usually App.jsx handles protection.
            // If we are here and not logged in, maybe just stay or go to login.
            // Assuming protected route, this shouldn't happen or we redirect.
            // navigate('/login', { replace: true });
        }
    }, [user, loading, navigate]);

    return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium">Redirecionando...</p>
            </div>
        </div>
    );
}