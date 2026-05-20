import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 lg:pb-0 flex flex-col">
        <div className="p-4 lg:p-6 max-w-6xl mx-auto w-full flex-1">
          {children}
        </div>
        <footer className="text-center py-3 px-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Desarrollado por{' '}
            <a
              href="https://www.scada.com.gt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 transition-colors"
            >
              SCADA S.A. Guatemala
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
