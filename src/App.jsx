import './App.css'
import Pages from "@/pages/index.jsx"
import { ReloadPrompt } from "@/components/ReloadPrompt"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/context/AuthContext"
import { ConfirmProvider } from "@/context/ConfirmContext"
import { OperationFeedbackProvider } from "@/context/OperationFeedbackContext"
import { BrowserRouter } from "react-router-dom"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OperationFeedbackProvider>
          <ConfirmProvider>
            <Pages />
            <Toaster />
            <ReloadPrompt />
          </ConfirmProvider>
        </OperationFeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App 