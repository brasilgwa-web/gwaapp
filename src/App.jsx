import './App.css'
import Pages from "@/pages/index.jsx"
import { ReloadPrompt } from "@/components/ReloadPrompt"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/context/AuthContext"
import { ConfirmProvider } from "@/context/ConfirmContext"
import { BrowserRouter } from "react-router-dom"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <Pages />
          <Toaster />
          <ReloadPrompt />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App 