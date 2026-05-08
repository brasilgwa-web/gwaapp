import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * Modal de feedback para operações CRUD
 * Estados: loading, success, error, warning
 */
export function OperationModal({
    open,
    onOpenChange,
    status = 'loading', // 'loading' | 'success' | 'error' | 'warning'
    title,
    message,
    onRetry,
    onClose,
    autoCloseDelay = 2000, // ms para fechar automaticamente em sucesso
}) {
    const [shouldAutoClose, setShouldAutoClose] = React.useState(false);

    // Auto-close em caso de sucesso
    React.useEffect(() => {
        if (status === 'success' && autoCloseDelay > 0) {
            setShouldAutoClose(true);
            const timer = setTimeout(() => {
                onOpenChange?.(false);
                onClose?.();
            }, autoCloseDelay);
            return () => clearTimeout(timer);
        }
        setShouldAutoClose(false);
    }, [status, autoCloseDelay, onOpenChange, onClose]);

    const statusConfig = {
        loading: {
            icon: Loader2,
            iconClass: 'text-blue-600 animate-spin',
            bgClass: 'bg-blue-100',
            title: title || 'Processando...',
            showCloseButton: false,
        },
        success: {
            icon: CheckCircle,
            iconClass: 'text-green-600',
            bgClass: 'bg-green-100',
            title: title || 'Sucesso!',
            showCloseButton: true,
        },
        error: {
            icon: XCircle,
            iconClass: 'text-red-600',
            bgClass: 'bg-red-100',
            title: title || 'Erro',
            showCloseButton: true,
        },
        warning: {
            icon: AlertTriangle,
            iconClass: 'text-amber-600',
            bgClass: 'bg-amber-100',
            title: title || 'Atenção',
            showCloseButton: true,
        },
    };

    const config = statusConfig[status] || statusConfig.loading;
    const Icon = config.icon;

    return (
        <Dialog open={open} onOpenChange={status !== 'loading' ? onOpenChange : undefined}>
            <DialogContent
                className="sm:max-w-md"
                onPointerDownOutside={(e) => {
                    // Impede fechar clicando fora durante loading
                    if (status === 'loading') e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    // Impede fechar com ESC durante loading
                    if (status === 'loading') e.preventDefault();
                }}
            >
                <VisuallyHidden><DialogTitle>{config?.title || 'Operação'}</DialogTitle></VisuallyHidden>
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    {/* Ícone */}
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center",
                        config.bgClass
                    )}>
                        <Icon className={cn("w-8 h-8", config.iconClass)} />
                    </div>

                    {/* Título */}
                    <h3 className="text-xl font-semibold text-slate-900">
                        {config.title}
                    </h3>

                    {/* Mensagem */}
                    {message && (
                        <p className="text-center text-slate-600 max-w-sm">
                            {message}
                        </p>
                    )}

                    {/* Barra de progresso para auto-close */}
                    {status === 'success' && shouldAutoClose && (
                        <div className="w-full max-w-xs h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 animate-shrink-width"
                                style={{
                                    animation: `shrinkWidth ${autoCloseDelay}ms linear forwards`
                                }}
                            />
                        </div>
                    )}

                    {/* Botões */}
                    {config.showCloseButton && status !== 'success' && (
                        <div className="flex gap-3 pt-2">
                            {status === 'error' && onRetry && (
                                <Button variant="outline" onClick={onRetry}>
                                    Tentar Novamente
                                </Button>
                            )}
                            <Button
                                onClick={() => {
                                    onOpenChange?.(false);
                                    onClose?.();
                                }}
                            >
                                Fechar
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// CSS para animação (adicionar ao index.css se necessário)
// @keyframes shrinkWidth {
//   from { width: 100%; }
//   to { width: 0%; }
// }

export default OperationModal;
