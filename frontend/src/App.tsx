import { useState, useEffect, useCallback } from 'react'
import './App.css'
import FilterSidebar from './components/FilterSidebar'
import KPICards from './components/KPICards'
import DeliveryVolumeChart from './components/DeliveryVolumeChart'
import TopProductsChart from './components/TopProductsChart'
import DeliveriesTable from './components/DeliveriesTable'
import {
  fetchFilters,
  fetchKPI,
  fetchDeliveries,
  fetchStock,
  fetchDivergences,
} from './services/api'
import type {
  Filters,
  FiltersData,
  KPIData,
  DeliveriesData,
  StockData,
  DivergencesData,
} from './types'
import { subDays } from 'date-fns'

const defaultFilters: Filters = {
  startDate: subDays(new Date(), 30),
  endDate: new Date(),
  schoolId: '',
  driverId: '',
}

function App() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters)

  const [filtersData, setFiltersData] = useState<FiltersData | null>(null)
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveriesData | null>(null)
  const [stock, setStock] = useState<StockData | null>(null)
  const [divergences, setDivergences] = useState<DivergencesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFilters().then(setFiltersData).catch(console.error)
    fetchKPI().then(setKpi).catch(console.error)
  }, [])

  const loadData = useCallback(async (f: Filters) => {
    setLoading(true)
    setError(null)
    try {
      const [del, stk, div] = await Promise.all([
        fetchDeliveries(f),
        fetchStock(f),
        fetchDivergences(f),
      ])
      setDeliveries(del)
      setStock(stk)
      setDivergences(div)
    } catch (e) {
      setError('Erro ao carregar dados. Verifique se o backend está rodando.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(appliedFilters)
  }, [appliedFilters, loadData])

  // Build delivery rows from divergences data for the table
  const deliveryRows = divergences
    ? [
        ...new Map(
          divergences.divergences.map((d) => [
            d.request_id,
            {
              request_id: d.request_id,
              school_name: d.school_name,
              driver_name: d.driver_name,
              delivered_at: d.delivered_at,
              status: 'delivered',
              divergences: [],
            },
          ])
        ).values(),
      ]
    : []

  return (
    <div className="app-layout">
      <FilterSidebar
        filters={filters}
        filtersData={filtersData}
        onFilterChange={setFilters}
        onApply={() => setAppliedFilters({ ...filters })}
      />

      <main className="main-content">
        <header className="app-header">
          <div className="header-logo">📦</div>
          <div>
            <h1 className="app-title">Seduclog</h1>
            <p className="app-subtitle">Dashboard de Acompanhamento de Entregas</p>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <KPICards data={kpi} />

        {loading ? (
          <div className="loading">Carregando dados…</div>
        ) : (
          <>
            <div className="charts-row">
              <DeliveryVolumeChart data={deliveries?.daily_volume ?? []} />
              <TopProductsChart data={stock?.top_products ?? []} />
            </div>

            <div className="stats-row">
              <div className="stat-card">
                <h4>Performance de Entregas</h4>
                <div className="stat-item">
                  <span>Total no período</span>
                  <strong>{deliveries?.total ?? 0}</strong>
                </div>
                <div className="stat-item">
                  <span>Taxa no prazo</span>
                  <strong className="green">{deliveries?.on_time_rate ?? 0}%</strong>
                </div>
                <div className="stat-item">
                  <span>Tempo médio (horas)</span>
                  <strong>{deliveries?.avg_delivery_hours ?? 0}h</strong>
                </div>
              </div>

              <div className="stat-card">
                <h4>Estoque Crítico (abaixo de 10)</h4>
                {stock?.stock_levels
                  .filter((s) => s.total_quantity < 10)
                  .slice(0, 5)
                  .map((s) => (
                    <div className="stat-item" key={s.id}>
                      <span>{s.name}</span>
                      <strong className="red">{s.total_quantity} un</strong>
                    </div>
                  )) ?? <p className="no-data">Sem alertas</p>}
              </div>

              <div className="stat-card">
                <h4>Divergências no Período</h4>
                <div className="stat-item">
                  <span>Total de itens com divergência</span>
                  <strong className="orange">{divergences?.total ?? 0}</strong>
                </div>
                {divergences?.divergences.slice(0, 3).map((d, i) => (
                  <div className="stat-item" key={i}>
                    <span>{d.product_name}</span>
                    <strong className="red">-{d.missing_quantity}</strong>
                  </div>
                ))}
              </div>
            </div>

            <DeliveriesTable
              deliveries={deliveryRows}
              divergences={divergences?.divergences ?? []}
            />
          </>
        )}
      </main>
    </div>
  )
}

export default App

