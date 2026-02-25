import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function Navbar() {
  const { isAuthenticated, nickname, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = (
    <>
      <Link
        to="/"
        className="text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
      >
        종목
      </Link>
      {isAuthenticated && (
        <>
          <Link
            to="/watchlist"
            className="text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            관심종목
          </Link>
          <Link
            to="/portfolio"
            className="text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            포트폴리오
          </Link>
        </>
      )}
    </>
  )

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        {/* Main row */}
        <div className="h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600 tracking-tight flex-shrink-0">
            📈 StockGuide
          </Link>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">{navLinks}</div>

          {/* Auth section */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:block text-sm text-gray-500 max-w-[80px] truncate">{nickname}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav links — second row */}
        <div className="sm:hidden flex items-center gap-1 pb-2">{navLinks}</div>
      </div>
    </nav>
  )
}
