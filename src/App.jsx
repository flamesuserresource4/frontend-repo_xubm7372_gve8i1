import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, useLocation, useNavigate } from 'react-router-dom'

const getBaseUrl = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function Navbar() {
  const location = useLocation()
  const nav = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/predict', label: 'Predict' },
    { to: '/reports', label: 'Monitor Report' },
    { to: '/profile', label: 'Profil' },
  ]
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="font-bold text-lg">UMKM Predict</Link>
        <nav className="flex items-center gap-4 text-sm">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={
                'px-3 py-1.5 rounded-md transition-colors ' +
                (location.pathname === n.to
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100')
              }
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-gray-800">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

function Card({ title, value, subtitle, children }) {
  return (
    <div className="bg-white/90 border border-gray-200 rounded-xl p-5 shadow-sm">
      {title && <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>}
      {value !== undefined && (
        <div className="text-2xl font-bold mb-1">{value}</div>
      )}
      {subtitle && <div className="text-xs text-gray-500 mb-2">{subtitle}</div>}
      {children}
    </div>
  )
}

// Dashboard Page
function DashboardPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${getBaseUrl()}/api/sales?limit=20`)
      if (!res.ok) throw new Error('Gagal memuat data penjualan')
      const data = await res.json()
      setSales(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totalRevenue = useMemo(() => sales.reduce((s, r) => s + (r.revenue || 0), 0), [sales])
  const avgRevenue = useMemo(() => (sales.length ? totalRevenue / sales.length : 0), [sales, totalRevenue])

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Total Pemasukan (sample)" value={`Rp ${totalRevenue.toFixed(0)}`} subtitle={`dari ${sales.length} hari`} />
        <Card title="Rata-rata Harian" value={`Rp ${avgRevenue.toFixed(0)}`} />
        <Card title="Rekor Hari Ini" value={sales.length ? `Rp ${Math.max(...sales.map(s=>s.revenue||0)).toFixed(0)}` : '-'} />
        <Card title="Terakhir Update" value={sales[0]?.date || '-'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Ringkasan Penjualan Terbaru">
          {loading ? (
            <p className="text-gray-500">Memuat...</p>
          ) : sales.length ? (
            <ul className="divide-y">
              {sales.slice(0, 8).map((r) => (
                <li key={r._id} className="py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{r.date || '-'}</span>
                  <span className="font-semibold">Rp {Number(r.revenue).toFixed(0)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Belum ada data. Tambahkan di Monitor Report.</p>
          )}
        </Card>
        <QuickPredict sales={sales} onPredicted={(v)=>{}} />
      </div>
    </Layout>
  )
}

function QuickPredict({ sales }) {
  const [method, setMethod] = useState('sma')
  const [windowSize, setWindowSize] = useState(3)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const series = (sales || []).map((s) => Number(s.revenue || 0))

  const run = async () => {
    if (!series.length) return
    try {
      setLoading(true)
      const res = await fetch(`${getBaseUrl()}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series, method, window: Number(windowSize) }),
      })
      const data = await res.json()
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (series.length) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, windowSize, sales.length])

  return (
    <Card title="Quick Predict">
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-xs text-gray-600">Metode</label>
          <select value={method} onChange={(e)=>setMethod(e.target.value)} className="block mt-1 px-3 py-2 border rounded-md">
            <option value="sma">SMA</option>
            <option value="ema">EMA</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Window</label>
          <input value={windowSize} onChange={(e)=>setWindowSize(e.target.value)} type="number" min="1" className="block mt-1 px-3 py-2 border rounded-md w-24" />
        </div>
        <button onClick={run} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50" disabled={!series.length || loading}>
          {loading ? 'Menghitung...' : 'Hitung' }
        </button>
      </div>
      {result ? (
        <div className="text-sm">
          <p className="mb-2">Hasil prediksi berikutnya:</p>
          <div className="text-2xl font-bold">Rp {Number(result.predicted).toFixed(0)}</div>
          <p className="text-xs text-gray-500 mt-1">Metode: {result.method.toUpperCase()} • Window: {result.window}</p>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Butuh data penjualan untuk memprediksi.</p>
      )}
    </Card>
  )
}

// Predict Page (manual input)
function PredictPage() {
  const [numbers, setNumbers] = useState('')
  const [method, setMethod] = useState('sma')
  const [windowSize, setWindowSize] = useState(3)
  const [alpha, setAlpha] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const series = numbers
      .split(/[\,\s]+/)
      .map((x) => Number(x))
      .filter((x) => !isNaN(x))
    if (series.length < 2) return alert('Masukkan minimal 2 angka')

    setLoading(true)
    try {
      const payload = { series, method, window: Number(windowSize) }
      if (alpha) payload.alpha = Number(alpha)
      const res = await fetch(`${getBaseUrl()}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Predict</h1>
      <form onSubmit={submit} className="bg-white/90 border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 max-w-2xl">
        <div>
          <label className="text-sm font-medium">Deret angka (pisahkan dengan koma/spasi)</label>
          <textarea value={numbers} onChange={(e)=>setNumbers(e.target.value)} className="mt-1 w-full border rounded-md p-3" rows={4} placeholder="contoh: 120000, 150000, 140000, 160000" />
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-gray-600">Metode</label>
            <select value={method} onChange={(e)=>setMethod(e.target.value)} className="block mt-1 px-3 py-2 border rounded-md">
              <option value="sma">SMA</option>
              <option value="ema">EMA</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Window</label>
            <input type="number" min="1" value={windowSize} onChange={(e)=>setWindowSize(e.target.value)} className="block mt-1 px-3 py-2 border rounded-md w-28" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Alpha (EMA opsional)</label>
            <input type="number" step="0.01" value={alpha} onChange={(e)=>setAlpha(e.target.value)} className="block mt-1 px-3 py-2 border rounded-md w-28" />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50" disabled={loading}>
            {loading ? 'Menghitung...' : 'Prediksi'}
          </button>
        </div>
        {result && (
          <div className="pt-2 text-sm">
            <div className="text-gray-600">Hasil prediksi:</div>
            <div className="text-2xl font-bold">Rp {Number(result.predicted).toFixed(0)}</div>
            <div className="text-xs text-gray-500 mt-1">Metode: {result.method.toUpperCase()} • Window: {result.window}</div>
          </div>
        )}
      </form>
    </Layout>
  )
}

// Monitor Report Page
function ReportsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateVal, setDateVal] = useState('')
  const [rev, setRev] = useState('')
  const [note, setNote] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${getBaseUrl()}/api/sales?limit=200`)
      const data = await res.json()
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!dateVal || !rev) return alert('Isi tanggal dan pemasukan')
    const payload = { date: dateVal, revenue: Number(rev), note }
    const res = await fetch(`${getBaseUrl()}/api/sales`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    if (!res.ok) return alert('Gagal menambah data')
    setDateVal(''); setRev(''); setNote(''); load()
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Monitor Report</h1>

      <form onSubmit={add} className="bg-white/90 border border-gray-200 rounded-xl p-5 shadow-sm mb-6 grid sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-xs text-gray-600">Tanggal</label>
          <input type="date" value={dateVal} onChange={(e)=>setDateVal(e.target.value)} className="block mt-1 px-3 py-2 border rounded-md w-full" />
        </div>
        <div>
          <label className="text-xs text-gray-600">Pemasukan (Rp)</label>
          <input type="number" value={rev} onChange={(e)=>setRev(e.target.value)} className="block mt-1 px-3 py-2 border rounded-md w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-gray-600">Catatan</label>
          <input type="text" value={note} onChange={(e)=>setNote(e.target.value)} className="block mt-1 px-3 py-2 border rounded-md w-full" placeholder="opsional" />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Tambah</button>
      </form>

      <div className="bg-white/90 border border-gray-200 rounded-xl p-5 shadow-sm">
        {loading ? (
          <p className="text-gray-500">Memuat...</p>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Pemasukan</th>
                  <th className="py-2 pr-4">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{r.date || '-'}</td>
                    <td className="py-2 pr-4">Rp {Number(r.revenue).toFixed(0)}</td>
                    <td className="py-2 pr-4">{r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Belum ada data.</p>
        )}
      </div>
    </Layout>
  )
}

// Profile Page
function ProfilePage() {
  const [profiles, setProfiles] = useState([])
  const [form, setForm] = useState({ business_name: '', owner_name: '', email: '', phone: '', address: '', category: '', description: '' })

  const load = async () => {
    const res = await fetch(`${getBaseUrl()}/api/profile`)
    const data = await res.json()
    setProfiles(data)
  }

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    const res = await fetch(`${getBaseUrl()}/api/profile`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    })
    if (!res.ok) return alert('Gagal menyimpan profil')
    setForm({ business_name: '', owner_name: '', email: '', phone: '', address: '', category: '', description: '' })
    load()
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Profil UMKM</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white/90 border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">Data Profil</h3>
          {profiles.length ? (
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">Nama Usaha:</span> {profiles[0].business_name}</p>
              <p><span className="text-gray-500">Pemilik:</span> {profiles[0].owner_name}</p>
              {profiles[0].category && <p><span className="text-gray-500">Kategori:</span> {profiles[0].category}</p>}
              {profiles[0].email && <p><span className="text-gray-500">Email:</span> {profiles[0].email}</p>}
              {profiles[0].phone && <p><span className="text-gray-500">Telepon:</span> {profiles[0].phone}</p>}
              {profiles[0].address && <p><span className="text-gray-500">Alamat:</span> {profiles[0].address}</p>}
              {profiles[0].description && <p className="pt-2 text-gray-600">{profiles[0].description}</p>}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada profil. Tambahkan melalui formulir.</p>
          )}
        </div>

        <form onSubmit={submit} className="bg-white/90 border border-gray-200 rounded-xl p-5 shadow-sm grid grid-cols-2 gap-3">
          {[
            { key: 'business_name', label: 'Nama Usaha' },
            { key: 'owner_name', label: 'Nama Pemilik' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Telepon' },
            { key: 'address', label: 'Alamat', cols: 2 },
            { key: 'category', label: 'Kategori' },
            { key: 'description', label: 'Deskripsi', cols: 2, textarea: true },
          ].map((f) => (
            <div key={f.key} className={f.cols === 2 ? 'col-span-2' : ''}>
              <label className="text-xs text-gray-600">{f.label}</label>
              {f.textarea ? (
                <textarea value={form[f.key]} onChange={(e)=>setForm({ ...form, [f.key]: e.target.value })} className="block mt-1 w-full border rounded-md p-2" rows={3} />
              ) : (
                <input value={form[f.key]} onChange={(e)=>setForm({ ...form, [f.key]: e.target.value })} className="block mt-1 w-full border rounded-md p-2" />
              )}
            </div>
          ))}
          <button type="submit" className="col-span-2 px-4 py-2 bg-blue-600 text-white rounded-md">Simpan Profil</button>
        </form>
      </div>
    </Layout>
  )
}

// Simple router switch using current location to render the page without creating new files
function RouterSwitch() {
  const location = useLocation()
  const path = location.pathname
  if (path === '/' || path === '/dashboard') return <DashboardPage />
  if (path === '/predict') return <PredictPage />
  if (path === '/reports') return <ReportsPage />
  if (path === '/profile') return <ProfilePage />
  return (
    <Layout>
      <div className="text-center py-24">
        <h1 className="text-3xl font-bold mb-2">Halaman tidak ditemukan</h1>
        <Link className="text-blue-600 underline" to="/dashboard">Kembali ke Dashboard</Link>
      </div>
    </Layout>
  )
}

function App() {
  // The App component just hosts the internal router switch
  return (
    <BrowserRouter>
      <RouterSwitch />
    </BrowserRouter>
  )
}

export default App
