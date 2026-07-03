import { useEffect } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/services/queryClient"
import { useAppStore } from "@/store/useAppStore"
import { MainLayout } from "@/layouts/MainLayout"
import { DashboardPage } from "@/pages/DashboardPage"
import { LoginForm } from "@/features/auth/LoginForm"

function AppContent() {
  const { token } = useAppStore()

  if (!token) {
    return <LoginForm />
  }

  return (
    <MainLayout>
      <DashboardPage />
    </MainLayout>
  )
}

function App() {
  const { theme, setTheme } = useAppStore()

  // Initialize theme on app mount
  useEffect(() => {
    setTheme(theme)
  }, [theme, setTheme])

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
