import { useState } from 'react'
import { Settings, Sliders, Type, Wand2 } from 'lucide-react'

interface ProcessingSettingsProps {
  onSettingsChange: (settings: ProcessingSettings) => void
  defaultSettings?: ProcessingSettings
}

export interface ProcessingSettings {
  segmentDuration: number
  enableSceneDetection: boolean
  enableCaptions: boolean
  enableFilters: boolean
  selectedFilter: string
  minSegmentLength: number
  maxSegments: number
}

const DEFAULT_SETTINGS: ProcessingSettings = {
  segmentDuration: 15,
  enableSceneDetection: true,
  enableCaptions: false,
  enableFilters: false,
  selectedFilter: 'none',
  minSegmentLength: 10,
  maxSegments: 5,
}

const FILTERS = [
  { id: 'none', name: 'None' },
  { id: 'boost', name: 'Boost Colors' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'grayscale', name: 'Grayscale' },
  { id: 'blur', name: 'Blur Background' },
]

export default function ProcessingSettings({ onSettingsChange, defaultSettings = DEFAULT_SETTINGS }: ProcessingSettingsProps) {
  const [settings, setSettings] = useState<ProcessingSettings>(defaultSettings)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSettingChange = <K extends keyof ProcessingSettings>(
    key: K,
    value: ProcessingSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-3">
          <Settings className="h-5 w-5 text-indigo-600" />
          <span className="font-medium text-gray-900">Processing Settings</span>
        </div>
        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Segment Duration */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Sliders className="h-4 w-4 mr-2" />
              Segment Duration (seconds)
            </label>
            <input
              type="range"
              min="5"
              max="60"
              value={settings.segmentDuration}
              onChange={(e) => handleSettingChange('segmentDuration', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>5s</span>
              <span>{settings.segmentDuration}s</span>
              <span>60s</span>
            </div>
          </div>

          {/* Scene Detection */}
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Wand2 className="h-4 w-4 mr-2" />
              AI Scene Detection
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.enableSceneDetection}
                onChange={(e) => handleSettingChange('enableSceneDetection', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Captions */}
          <div className="flex items-center justify-between opacity-50">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Type className="h-4 w-4 mr-2" />
              Auto-generate Captions (Coming Soon)
            </label>
            <label className="relative inline-flex items-center cursor-not-allowed">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={false}
                disabled={true}
                onChange={() => {}}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Video Filters */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Wand2 className="h-4 w-4 mr-2" />
              Video Filter
            </label>
            <select
              value={settings.selectedFilter}
              onChange={(e) => handleSettingChange('selectedFilter', e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {FILTERS.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.name}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4 border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-900">Advanced Settings</h4>
            
            <div>
              <label className="text-sm text-gray-700 block mb-1">
                Minimum Segment Length (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                value={settings.minSegmentLength}
                onChange={(e) => handleSettingChange('minSegmentLength', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 block mb-1">
                Maximum Number of Segments
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxSegments}
                onChange={(e) => handleSettingChange('maxSegments', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 