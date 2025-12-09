
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSession = async (session) => {
        setSession(session);
        let currentUser = session?.user ?? null;

        if (currentUser) {
            // Fetch fresh profile data including signature_url
            // We do this to ensure we have the custom columns like signature_url that are NOT in user_metadata by default
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (profile) {
                currentUser = {
                    ...currentUser,
                    ...profile, // Merge profile columns (signature_url, full_name, role) into user object
                };
            }
        }

        // TEMPORARY: Force specific email to be admin for development/testing
        if (currentUser && currentUser.email === 'andre.lsarruda@gmail.com') {
            currentUser = {
                ...currentUser,
                role: 'admin' // Ensure role override applies
            };
        }
        setUser(currentUser);
        setLoading(false);
    }

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signup = async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName, // Add full name to metadata
                    status: 'inactive', // User is inactive by default
                    role: 'user',       // Default role
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        navigate('/login');
    };

    const value = {
        session,
        user,
        login,
        signup,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading ? children : <div className="flex items-center justify-center h-screen">Carregando autenticação...</div>}
        </AuthContext.Provider>
    );
};
