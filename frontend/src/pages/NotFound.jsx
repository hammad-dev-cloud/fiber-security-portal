import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="font-display text-7xl font-bold text-gradient">404</div>
      <p className="mt-3 text-ink-300">The page you were looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6"><Home className="w-4 h-4" /> Back to dashboard</Link>
    </div>
  )
}
