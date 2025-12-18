import './App.css'
import Pages from "@/pages/index.jsx"
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
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App 