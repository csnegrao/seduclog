import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import type { Filters, FiltersData } from '../types';

interface Props {
  filters: Filters;
  filtersData: FiltersData | null;
  onFilterChange: (f: Filters) => void;
  onApply: () => void;
}

export default function FilterSidebar({ filters, filtersData, onFilterChange, onApply }: Props) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Filtros</h2>

      <div className="filter-group">
        <label>Data Inicial</label>
        <DatePicker
          selected={filters.startDate}
          onChange={(date: Date | null) => onFilterChange({ ...filters, startDate: date })}
          dateFormat="dd/MM/yyyy"
          placeholderText="Selecionar data"
          className="date-input"
        />
      </div>

      <div className="filter-group">
        <label>Data Final</label>
        <DatePicker
          selected={filters.endDate}
          onChange={(date: Date | null) => onFilterChange({ ...filters, endDate: date })}
          dateFormat="dd/MM/yyyy"
          placeholderText="Selecionar data"
          className="date-input"
        />
      </div>

      <div className="filter-group">
        <label>Escola</label>
        <select
          value={filters.schoolId}
          onChange={(e) => onFilterChange({ ...filters, schoolId: e.target.value })}
          className="select-input"
        >
          <option value="">Todas as escolas</option>
          {filtersData?.schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Motorista</label>
        <select
          value={filters.driverId}
          onChange={(e) => onFilterChange({ ...filters, driverId: e.target.value })}
          className="select-input"
        >
          <option value="">Todos os motoristas</option>
          {filtersData?.drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <button className="apply-btn" onClick={onApply}>
        Aplicar Filtros
      </button>
    </aside>
  );
}
