import React, { useMemo, useState } from 'react'
import { AppView, ItemCategory } from '../types'
import Header from '../components/Header'
import Button from '../components/Button'

interface CropCalendarScreenProps {
  navigate: (view: AppView) => void
  goBack: () => void
}

type Stage = { name: string; suggestion: string; category: ItemCategory }

const presets: Record<string, Stage[]> = {
  MAIZE: [
    { name: 'Sowing', suggestion: 'Tractor + Seed Drill', category: ItemCategory.Tractors },
    { name: 'Weeding', suggestion: 'Power Weeder', category: ItemCategory.Workers },
    { name: 'Spraying', suggestion: 'Drone Sprayer', category: ItemCategory.Drones },
    { name: 'Harvesting', suggestion: 'Combine Harvester', category: ItemCategory.Harvesters }
  ],
  PADDY: [
    { name: 'Transplanting', suggestion: 'Workers', category: ItemCategory.Workers },
    { name: 'Weeding', suggestion: 'Power Weeder', category: ItemCategory.Workers },
    { name: 'Spraying', suggestion: 'Drone Sprayer', category: ItemCategory.Drones },
    { name: 'Harvesting', suggestion: 'Paddy Harvester', category: ItemCategory.Harvesters }
  ],
  WHEAT: [
    { name: 'Sowing', suggestion: 'Tractor + Seed Drill', category: ItemCategory.Tractors },
    { name: 'Weeding', suggestion: 'Workers', category: ItemCategory.Workers },
    { name: 'Spraying', suggestion: 'Sprayer', category: ItemCategory.Sprayers },
    { name: 'Harvesting', suggestion: 'Combine Harvester', category: ItemCategory.Harvesters }
  ]
}

const CropCalendarScreen: React.FC<CropCalendarScreenProps> = ({ navigate, goBack }) => {
  const [crop, setCrop] = useState('MAIZE')
  const stages = useMemo(() => presets[crop] || [], [crop])

  const action = (s: Stage) => {
    navigate({ view: 'BOOKING_FORM', category: s.category })
  }

  return (
    <div className="dark:text-neutral-200">
      <Header title="Crop Calendar" onBack={goBack} />
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Crop</label>
          <select value={crop} onChange={e => setCrop(e.target.value)} className="shadow appearance-none border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white">
            {Object.keys(presets).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {stages.map((s, i) => (
            <div key={i} className="p-4 bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 flex justify-between items-center">
              <div>
                <p className="text-xs text-neutral-500">Stage</p>
                <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{s.name}</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{s.suggestion}</p>
              </div>
              <Button onClick={() => action(s)} className="w-auto px-4 py-1 text-sm">View Options</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CropCalendarScreen