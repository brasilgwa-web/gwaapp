import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/context/AuthContext"
import { BrowserRouter } from "react-router-dom"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Pages />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App 