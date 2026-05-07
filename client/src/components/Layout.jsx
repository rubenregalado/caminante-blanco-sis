import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 lg:pb-0">
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
