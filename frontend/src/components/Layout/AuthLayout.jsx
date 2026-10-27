export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-ARMA-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
