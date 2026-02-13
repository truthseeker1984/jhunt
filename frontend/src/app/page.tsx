export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-24 text-white">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold tracking-tight">
          J(ob)Hunt
        </h1>
        <p className="mb-8 text-xl text-gray-400">
          Inteligentny agregator ofert pracy.
        </p>
        <div className="inline-block rounded-full bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-blue-500/30">
          Coming Soon
        </div>
      </div>
      
      <div className="mt-16 text-sm text-gray-500">
        <p>Infrastruktura: Cloudflare • Vercel • Mikrus VPS • FastAPI • Next.js</p>
      </div>
    </div>
  );
}
