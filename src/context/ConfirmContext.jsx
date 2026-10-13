import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmLabel: 'Confirmar',
        cancelLabel: 'Cancelar',
        type: 'confirm', // 'confirm' | 'alert' | 'success' | 'error' | 'warning'
        resolve: null,
    });

    const confirm = useCallback(({ title, message, confirmLabel, cancelLabel, type = 'confirm' }) => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                title: title || 'Confirmação',
                message: message || 'Tem certeza que deseja continuar?',
                confirmLabel: confirmLabel || 'Confirmar',
                cancelLabel: cancelLabel || 'Cancelar',
                type,
                resolve,
            });
        });
    }, []);

    const alert = useCallback(({ title, message, type = 'info' }) => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                title: title || 'Aviso',
                message: message || '',
                confirmLabel: 'OK',
                cancelLabel: null, // No cancel button for alerts
                type,
                resolve,
            });
        });
    }, []);

    const handleConfirm = () => {
        state.resolve?.(true);
        setState(prev => ({ ...prev, isOpen: false }));
    };

    const handleCancel = () => {
        state.resolve?.(false);
        setState(prev => ({ ...prev, isOpen: false }));
    };

    const getIcon = () => {
        switch (state.type) {
            case 'success':
                return <CheckCircle className="w-6 h-6 text-green-600" />;
            case 'error':
                return <XCircle className="w-6 h-6 text-red-600" />;
            case 'warning':
            case 'confirm':
                return <AlertTriangle className="w-6 h-6 text-amber-500" />;
            default:
                return <Info className="w-6 h-6 text-blue-600" />;
        }
    };

    const getButtonClass = () => {
        switch (state.type) {
            case 'success':
                return 'bg-green-600 hover:bg-green-700';
            case 'error':
                return 'bg-red-600 hover:bg-red-700';
            case 'warning':
                return 'bg-amber-500 hover:bg-amber-600';
            default:
                return 'bg-blue-600 hover:bg-blue-700';
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            <AlertDialog open={state.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <AlertDialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6 overflow-hidden">
                    <AlertDialogHeader className="flex-shrink-0">
                        <AlertDialogTitle className="flex items-center gap-3 text-lg font-bold">
                            {getIcon()}
                            {state.title}
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="flex-1 overflow-y-auto max-h-[55vh] py-3 pr-2 my-1 border-y border-slate-100/80">
                        <AlertDialogDescription className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed font-normal">
                            {state.message}
                        </AlertDialogDescription>
                    </div>
                    <AlertDialogFooter className="flex-shrink-0 pt-2 gap-2 sm:gap-0">
                        {state.cancelLabel && (
                            <AlertDialogCancel onClick={handleCancel}>
                                {state.cancelLabel}
                            </AlertDialogCancel>
                        )}
                        <AlertDialogAction onClick={handleConfirm} className={getButtonClass()}>
                            {state.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
}
