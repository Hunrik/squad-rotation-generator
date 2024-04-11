import fs from 'fs'
import readline from 'readline'

interface LayerInfo {
  name: string
  level: string
  layerType: string
  version: string
  factions: Faction[]
}

interface Faction {
  name: string
  units: Unit[]
}

interface Unit {
  name: string
  type: string
  availableOnTeam: Team
}

type Team = 'Team1' | 'Team2' | 'Both'

interface State {
  levelName?: string
  currentLayer?: LayerInfo
  layers: Record<string, LayerInfo>
  currentFaction?: Faction
}
interface MapInfo {
  levelName: string
  layers: Record<string, LayerInfo>
}

export async function parseLayerinfo (path: string): Promise<Record<string, MapInfo>> {
  const fileStream = fs.createReadStream(path)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  const contents: Record<string, MapInfo> = {}

  let started = false
  let state: State = {
    layers: {}
  }
  for await (const rawLine of rl) {
    const line = rawLine.split(',')
    const [, level, layer, faction, unitType, unitName, availableOnTeam] = line

    const emptyLine = line.every((item) => item === '')
    if (emptyLine && !started) {
      started = true
      continue
    } else if (!started) {
      continue
    }

    if (faction) {
      if (state.currentFaction != null) {
        state.currentLayer?.factions.push(state.currentFaction)
      }
      state.currentFaction = {
        name: faction,
        units: []
      }
    }

    if (unitName) {
      state.currentFaction?.units.push({
        name: unitName,
        type: unitType || 'CombinedArms',
        availableOnTeam: parseTeam(availableOnTeam)
      })
    }

    if (layer) {
      if (state.currentLayer != null) {
        state.layers[state.currentLayer.name] = state.currentLayer
      }
      state.currentLayer = parseLayerName(layer)
    }

    if (level) {
      if (state.currentFaction != null) {
        state.currentLayer?.factions.push(state.currentFaction)
      }
      if (state.currentLayer != null) {
        state.layers[state.currentLayer.name] = state.currentLayer
      }
      if (state.levelName !== undefined) {
        contents[state.levelName] = {
          levelName: state.levelName,
          layers: state.layers
        }
      }
      state = {
        levelName: level,
        layers: {}
      }
    }
  }
  // Commit last state
  if (state.levelName !== undefined) {
    contents[state.levelName] = {
      levelName: state.levelName,
      layers: state.layers
    }
  }

  return contents
}

parseLayerinfo('./layerinfo.csv')

interface RotationFilters {
  maps?: string[]
  layers?: string[]
  factions?: string[]
  gameModes?: string[]
}

interface Rotation {
  layer: string
  team1: string
  team2: string
}

export function generateRotations (layerinfo: Record<string, MapInfo>, filters: RotationFilters): Rotation[] {
  // Generate all possible rotations
  // Filter out rotations that don't match the filters
  // Empty filters means all rotations are valid

  const validMaps = (filters.layers != null)
    ? Object.keys(layerinfo).filter(map => filters.maps?.includes(map))
    : Object.keys(layerinfo)


  const rotations: Rotation[] = []

  for (const map of validMaps) {
    const mapInfo = layerinfo[map]
    const validLayers = (filters.layers != null)
      ? Object.keys(mapInfo.layers).filter(layer => filters.layers?.includes(layer))
      : Object.keys(mapInfo.layers)

    console.log(validLayers)
    for (const layer of validLayers) {
      const layerInfo = mapInfo.layers[layer]
      if (filters.gameModes != null && !filters.gameModes.includes(layerInfo.layerType)) {
        continue
      }

      const validFactions = (filters.factions != null)
        ? layerInfo.factions.filter(faction => filters.factions?.includes(faction.name))
        : layerInfo.factions

        validFactions.forEach(faction => {
          const team1 = pickTeam(faction, 'Team1')
          const team2 = pickTeam(faction, 'Team2')
          rotations.push({
            layer: layer,
            team1: team1.name,
            team2: team2.name
          })
        })
    }
  }
  return rotations
}

function pickTeam(faction: Faction, team: Team): Faction {
  return {
    name: faction.name,
    units: faction.units.filter(unit => unit.availableOnTeam === team || unit.availableOnTeam === 'Both')
  }
}

export function parseLayerName (layer: string): LayerInfo {
  const layerName = layer.split('_')
  return {
    name: layer,
    level: layerName[0],
    layerType: layerName[1],
    version: layerName[2],
    factions: []
  }
}

function parseTeam (team: string): Team {
  if (team === 'Team1 / Team2') {
    return 'Both'
  }
  if (team === 'Team1') {
    return 'Team1'
  }
  if (team === 'Team2') {
    return 'Team2'
  }
  throw new Error(`Unknown team: ${team}`)
}
