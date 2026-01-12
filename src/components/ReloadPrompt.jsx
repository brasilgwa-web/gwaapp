import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

export function ReloadPrompt() {
    const { toast } = useToast()

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            if (r) {
                // Checa por atualizações a cada hora
                setInterval(() => {
                    r.update()
                }, 60 * 60 * 1000)
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    useEffect(() => {
        if (needRefresh) {
            toast({
                title: "Nova versão disponível",
                description: "Uma nova versão do app está disponível. Clique em atualizar para carregar.",
                action: (
                    <ToastAction altText="Atualizar" onClick={() => updateServiceWorker(true)}>
                        Atualizar
                    </ToastAction>
                ),
                duration: Infinity, // Mantém o toast visível até o usuário interagir
            })
        }
    }, [needRefresh, updateServiceWorker, toast])

    useEffect(() => {
        if (offlineReady) {
            toast({
                title: "App pronto para uso offline",
                description: "O aplicativo foi salvo para uso sem internet.",
                duration: 5000,
            })
            setOfflineReady(false)
        }
    }, [offlineReady, setOfflineReady, toast])

    return null
}
