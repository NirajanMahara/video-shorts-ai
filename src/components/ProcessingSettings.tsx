import { useState } from 'react'
import { Dialog } from './ui/dialog'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Slider } from './ui/slider'
import { Select } from './ui/select'

export interface ProcessingSettings {
  segmentDuration: number
  enableSceneDetection: boolean
  enableFaceDetection: boolean
  enableAudioAnalysis: boolean
  enableCaptions: boolean
  enableFilters: boolean
  enableDynamicEffects: boolean
  selectedFilter: string
  minSegmentLength: number
  maxSegments: number
  captionStyle: string
  transitionStyle: string
}

export interface ProcessingSettingsProps {
  onSettingsChange: (settings: ProcessingSettings) => void
  defaultSettings: ProcessingSettings
}

export default function ProcessingSettings({ onSettingsChange, defaultSettings }: ProcessingSettingsProps) {
  const [settings, setSettings] = useState<ProcessingSettings>({
    segmentDuration: defaultSettings.segmentDuration || 15,
    enableSceneDetection: defaultSettings.enableSceneDetection || true,
    enableFaceDetection: defaultSettings.enableFaceDetection || true,
    enableAudioAnalysis: defaultSettings.enableAudioAnalysis || true,
    enableCaptions: defaultSettings.enableCaptions || true,
    enableFilters: defaultSettings.enableFilters || false,
    enableDynamicEffects: defaultSettings.enableDynamicEffects || true,
    selectedFilter: defaultSettings.selectedFilter || 'none',
    minSegmentLength: defaultSettings.minSegmentLength || 10,
    maxSegments: defaultSettings.maxSegments || 5,
    captionStyle: defaultSettings.captionStyle || 'standard',
    transitionStyle: defaultSettings.transitionStyle || 'fade'
  })

  const handleSettingChange = (key: keyof ProcessingSettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Processing Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="segmentDuration">Segment Duration (seconds)</Label>
            <Slider
              id="segmentDuration"
              min={5}
              max={60}
              step={5}
              value={[settings.segmentDuration]}
              onValueChange={([value]) => handleSettingChange('segmentDuration', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sceneDetection">Scene Detection</Label>
            <Switch
              id="sceneDetection"
              checked={settings.enableSceneDetection}
              onCheckedChange={(checked) => handleSettingChange('enableSceneDetection', checked)}
            />
        </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="faceDetection">Face Detection</Label>
            <Switch
              id="faceDetection"
              checked={settings.enableFaceDetection}
              onCheckedChange={(checked) => handleSettingChange('enableFaceDetection', checked)}
            />
        </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="audioAnalysis">Audio Analysis</Label>
            <Switch
              id="audioAnalysis"
              checked={settings.enableAudioAnalysis}
              onCheckedChange={(checked) => handleSettingChange('enableAudioAnalysis', checked)}
            />
            </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="captions">Auto-Captions</Label>
            <Switch
              id="captions"
              checked={settings.enableCaptions}
              onCheckedChange={(checked) => handleSettingChange('enableCaptions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dynamicEffects">Dynamic Effects</Label>
            <Switch
              id="dynamicEffects"
              checked={settings.enableDynamicEffects}
              onCheckedChange={(checked) => handleSettingChange('enableDynamicEffects', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="filters">Visual Filters</Label>
            <Switch
              id="filters"
              checked={settings.enableFilters}
              onCheckedChange={(checked) => handleSettingChange('enableFilters', checked)}
            />
          </div>

          {settings.enableFilters && (
            <div className="flex items-center justify-between">
              <Label htmlFor="filterSelect">Filter Style</Label>
              <Select
                id="filterSelect"
              value={settings.selectedFilter}
                onValueChange={(value) => handleSettingChange('selectedFilter', value)}
              >
                <option value="none">None</option>
                <option value="cinematic">Cinematic</option>
                <option value="vintage">Vintage</option>
                <option value="dramatic">Dramatic</option>
              </Select>
            </div>
          )}

          {settings.enableCaptions && (
            <div className="flex items-center justify-between">
              <Label htmlFor="captionStyle">Caption Style</Label>
              <Select
                id="captionStyle"
                value={settings.captionStyle}
                onValueChange={(value) => handleSettingChange('captionStyle', value)}
              >
                <option value="standard">Standard</option>
                <option value="minimal">Minimal</option>
                <option value="bold">Bold</option>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="transitionStyle">Transition Style</Label>
            <Select
              id="transitionStyle"
              value={settings.transitionStyle}
              onValueChange={(value) => handleSettingChange('transitionStyle', value)}
            >
              <option value="fade">Fade</option>
              <option value="dissolve">Dissolve</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="maxSegments">Maximum Segments</Label>
            <Slider
              id="maxSegments"
              min={1}
              max={10}
              step={1}
              value={[settings.maxSegments]}
              onValueChange={([value]) => handleSettingChange('maxSegments', value)}
              />
            </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="minSegmentLength">Minimum Segment Length (seconds)</Label>
            <Slider
              id="minSegmentLength"
              min={5}
              max={30}
              step={5}
              value={[settings.minSegmentLength]}
              onValueChange={([value]) => handleSettingChange('minSegmentLength', value)}
              />
            </div>
          </div>
        </div>
    </div>
  )
} 