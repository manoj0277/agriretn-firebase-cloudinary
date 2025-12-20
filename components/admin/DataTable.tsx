import React, { useMemo, useState } from 'react'


export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sort?: (a: T, b: T) => number
}

interface DataTableProps<T> {
  title?: string
  data: T[]
  columns: Column<T>[]
  defaultSortKey?: string
  filter?: (row: T) => boolean
  onRowClick?: (row: T) => void
  exportFileName?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void
}

const DataTable = <T extends Record<string, any>>({
  title,
  data,
  columns,
  defaultSortKey,
  filter,
  onRowClick,
  exportFileName = 'export',
  sortKey,
  sortDir,
  onSortChange
}: DataTableProps<T>) => {
  const [internalSortKey, setInternalSortKey] = useState<string | undefined>(defaultSortKey)
  const [internalSortDir, setInternalSortDir] = useState<'asc' | 'desc'>('desc')
  const [query, setQuery] = useState('')

  const effectiveSortKey = typeof sortKey === 'string' ? sortKey : internalSortKey
  const effectiveSortDir: 'asc' | 'desc' = sortDir || internalSortDir

  const filtered = useMemo(() => {
    const rows = filter ? data.filter(filter) : data
    if (!query) return rows
    const q = query.toLowerCase()
    return rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)))
  }, [data, filter, query])

  const sorted = useMemo(() => {
    if (!effectiveSortKey) return filtered
    const col = columns.find(c => String(c.key) === effectiveSortKey)
    const sorter = col?.sort
    const arr = [...filtered]
    arr.sort((a, b) => {
      const s = sorter ? sorter(a, b) : String(a[effectiveSortKey as keyof T] ?? '').localeCompare(String(b[effectiveSortKey as keyof T] ?? ''))
      return effectiveSortDir === 'asc' ? s : -s
    })
    return arr
  }, [filtered, effectiveSortKey, effectiveSortDir, columns])

  const handleSort = (key: string) => {
    if (effectiveSortKey === key) {
      const nextDir = effectiveSortDir === 'asc' ? 'desc' : 'asc'
      if (onSortChange) onSortChange(key, nextDir)
      else setInternalSortDir(nextDir)
    } else {
      if (onSortChange) onSortChange(key, 'desc')
      else {
        setInternalSortKey(key)
        setInternalSortDir('desc')
      }
    }
  }



  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {title && <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{title}</h3>}
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{sorted.length} rows</span>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex gap-2 mb-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {columns.map(c => (
                  <th
                    key={String(c.key)}
                    onClick={() => handleSort(String(c.key))}
                    className="px-3 py-2 text-left text-neutral-600 dark:text-neutral-300 cursor-pointer select-none"
                  >
                    {c.header}
                    {effectiveSortKey === String(c.key) && (
                      <span className="ml-1 text-xs">{effectiveSortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className="border-t border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                >
                  {columns.map(c => (
                    <td key={String(c.key)} className="px-3 py-2">
                      {c.render ? c.render(row) : String(row[c.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-neutral-500 dark:text-neutral-400" colSpan={columns.length}>No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DataTable