import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Login from "./Login";
import SetupClients from "./SetupClients";
import SetupEquipments from "./SetupEquipments";
import SetupTests from "./SetupTests";
import SetupProducts from "./SetupProducts";
import SetupTemplates from "./SetupTemplates";
import SetupAI from "./SetupAI";
import Dashboard from "./Dashboard";
import Visits from "./Visits";
import VisitDetail from "./VisitDetail";
import UserManagement from "./UserManagement";
import Profile from "./Profile";
import ReportView from "./ReportView";
import { useAuth } from "@/context/AuthContext";

const ProtectedRoute = ({ children }) => {
    const { session, loading } = useAuth();
    if (loading) return <div>Carregando...</div>;
    if (!session) return <Navigate to="/login" replace />;
    return children;
};

export default function Pages() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="visits" element={<Visits />} />
                <Route path="visits/:id" element={<VisitDetail />} />
                <Route path="setup/clients" element={<SetupClients />} />
                <Route path="setup/equipments" element={<SetupEquipments />} />
                <Route path="setup/tests" element={<SetupTests />} />
                <Route path="setup/products" element={<SetupProducts />} />
                <Route path="setup/templates" element={<SetupTemplates />} />
                <Route path="setup/ai" element={<SetupAI />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="profile" element={<Profile />} />
                <Route path="*" element={<div>Página não encontrada</div>} />
            </Route>
            <Route path="/report/:id" element={<ReportView />} />
        </Routes>
    );
}