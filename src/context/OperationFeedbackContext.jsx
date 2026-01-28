import React, { createContext, useContext, useState, useCallback } from 'react';
import { OperationModal } from '@/components/ui/operation-modal';
import { supabase } from '@/lib/supabase';

const OperationFeedbackContext = createContext(null);

export function OperationFeedbackProvider({ children }) {
    const [modalState, setModalState] = useState({
        open: false,
        status: 'loading',
        title: '',
        message: '',
        onRetry: null,
    });

    // Mostrar modal de loading
    const showLoading = useCallback((message = 'Processando...') => {
        setModalState({
            open: true,
            status: 'loading',
            title: 'Aguarde',
            message,
            onRetry: null,
        });
    }, []);

    // Mostrar modal de sucesso
    const showSuccess = useCallback((message = 'Operação realizada com sucesso!', title = 'Sucesso!') => {
        setModalState({
            open: true,
            status: 'success',
            title,
            message,
            onRetry: null,
        });
    }, []);

    // Mostrar modal de erro
    const showError = useCallback((message = 'Ocorreu um erro. Tente novamente.', title = 'Erro', onRetry = null) => {
        setModalState({
            open: true,
            status: 'error',
            title,
            message,
            onRetry,
        });
    }, []);

    // Mostrar modal de warning
    const showWarning = useCallback((message, title = 'Atenção') => {
        setModalState({
            open: true,
            status: 'warning',
            title,
            message,
            onRetry: null,
        });
    }, []);

    // Fechar modal
    const hideModal = useCallback(() => {
        setModalState(prev => ({ ...prev, open: false }));
    }, []);

    // Função para logar operação no system_logs
    const logOperation = useCallback(async (level, category, message, details = {}) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            await supabase.from('system_logs').insert({
                level,
                category,
                message,
                details,
                user_id: user?.id || null,
            });
        } catch (error) {
            console.error('Erro ao salvar log:', error);
        }
    }, []);

    // Wrapper para executar operação com feedback automático
    const executeWithFeedback = useCallback(async ({
        operation,
        loadingMessage = 'Processando...',
        successMessage = 'Operação realizada com sucesso!',
        errorMessage = 'Ocorreu um erro. Tente novamente.',
        logCategory = 'crud',
        logDetails = {},
        onRetry = null,
    }) => {
        showLoading(loadingMessage);

        try {
            const result = await operation();

            // Log de sucesso
            await logOperation('info', logCategory, successMessage, {
                ...logDetails,
                success: true,
            });

            showSuccess(successMessage);
            return { success: true, data: result };
        } catch (error) {
            const errorMsg = error?.message || errorMessage;

            // Log de erro
            await logOperation('error', logCategory, errorMsg, {
                ...logDetails,
                success: false,
                error: error?.message,
                stack: error?.stack,
            });

            showError(errorMsg, 'Erro', onRetry);
            return { success: false, error };
        }
    }, [showLoading, showSuccess, showError, logOperation]);

    const value = {
        showLoading,
        showSuccess,
        showError,
        showWarning,
        hideModal,
        logOperation,
        executeWithFeedback,
    };

    return (
        <OperationFeedbackContext.Provider value={value}>
            {children}
            <OperationModal
                open={modalState.open}
                onOpenChange={(open) => setModalState(prev => ({ ...prev, open }))}
                status={modalState.status}
                title={modalState.title}
                message={modalState.message}
                onRetry={modalState.onRetry}
                onClose={hideModal}
            />
        </OperationFeedbackContext.Provider>
    );
}

export function useOperationFeedback() {
    const context = useContext(OperationFeedbackContext);
    if (!context) {
        throw new Error('useOperationFeedback must be used within OperationFeedbackProvider');
    }
    return context;
}

export default OperationFeedbackContext;
