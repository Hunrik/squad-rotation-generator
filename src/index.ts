import fs from 'fs'
import readline from 'readline'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

yargs(hideBin(process.argv))
  .command('rotations', 'Generate rotations based on layerinfo',() => {}, main)
  .option('factions', {
    alias: 'f',
    type: 'string',
    description: 'Set faction filter'
  })
  .option('gamemode', {
    alias: 'g',
    type: 'string',
    description: 'Set gamemode filter'
  })
  .option('layers', {
    alias: 'l',
    type: 'string',
    description: 'Set layer filter'
  })
  .option('maps', {
    alias: 'm',
    type: 'string',
    description: 'Set map filter'
  })
  .option('input', {
    alias: 'i',
    type: 'string',
    description: 'Set input file',
    default: './layerinfo.csv'
  })
  .option('out', {
    alias: 'o',
    type: 'string',
    description: 'Set output file'
  })
  .demandCommand(1)
  .parse()

async function main (argv) {
  const layerInfo = await parseLayerinfo(argv.input)
  const filters = {
    factions: argv.factions?.split(','),
    gameModes: argv.gamemode?.split(','),
    layers: argv.layers?.split(','),
    maps: argv.maps?.split(',')
  }
  const rotations = generateRotations(layerInfo, filters)

  const output = argv.out ? fs.createWriteStream(argv.out) : process.stdout
  rotations.forEach((rotation) => {
    output.write(`${rotation.layer} ${rotation.team1} ${rotation.team2}\n`)
  })
  output.end()
}




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
  const validMaps = (filters.maps != null)
    ? Object.keys(layerinfo).filter(map => filters.maps?.includes(map))
    : Object.keys(layerinfo)

  const rotations: Rotation[] = []

  for (const map of validMaps) {
    const mapInfo = layerinfo[map]
    let validLayers = (filters.layers != null)
      ? Object.keys(mapInfo.layers).filter(layer => filters.layers?.includes(layer))
      : Object.keys(mapInfo.layers)

    if (filters.gameModes != null) {
      validLayers = validLayers.filter(layer => filters.gameModes?.includes(mapInfo.layers[layer].layerType))
    }
    
    for (const layer of validLayers) {
      const layerInfo = mapInfo.layers[layer]
      if (filters.gameModes != null && !filters.gameModes.includes(layerInfo.layerType)) {
        continue
      }

      const factionsAvailaibleForTeam1 = layerInfo.factions.filter(faction => faction.units.some(unit => unit.availableOnTeam === 'Team1' || unit.availableOnTeam === 'Both'))
      const factionsAvailaibleForTeam2 = layerInfo.factions.filter(faction => faction.units.some(unit => unit.availableOnTeam === 'Team2' || unit.availableOnTeam === 'Both'))

      for (const faction1 of factionsAvailaibleForTeam1) {
        for (const faction2 of factionsAvailaibleForTeam2) {
          if (filters.factions != null) {
            if (!filters.factions?.includes(faction1.name) && !filters.factions?.includes(faction2.name)) {
              continue
            }
          }
          if (canPlayAgainst(faction1.name as FactionName, faction2.name as FactionName)) {
            rotations.push({
              layer,
              team1: pickTeam(faction1, 'Team1').name,
              team2: pickTeam(faction2, 'Team2').name
            })
          }
        }
      }
    }
  }

  return rotations
}

type FactionName = 'VDV' | 'RDF' | 'ADF' | 'BFA' | 'CAF' | 'USA' | 'USMC' | 'PLA' | 'PLANMC' | 'PLAAGF' | 'MEA' | 'TLF' | 'INS' | 'IMF'

interface FactionAlliance {
  REDFOR: FactionName[]
  BLUFOR: FactionName[]
  PAC: FactionName[]
  INDEPENDENT: FactionName[]
}

const factionAlliance: FactionAlliance = {
  REDFOR: ['VDV', 'RDF'],
  BLUFOR: ['ADF', 'BFA', 'CAF', 'USA', 'USMC'],
  PAC: ['PLA', 'PLANMC', 'PLAAGF'],
  INDEPENDENT: ['MEA', 'TLF', 'INS', 'IMF']
}

export function allianceByFaction (faction: FactionName): keyof FactionAlliance | null {
  for (const alliance in factionAlliance) {
    if (factionAlliance[alliance].includes(faction)) {
      return alliance as keyof FactionAlliance
    }
  }

  return null
}

function canPlayAgainst (faction1: FactionName, faction2: FactionName): boolean {
  if (faction1 === faction2) {
    return false // You can’t play against the same faction
  }

  const alliance1 = allianceByFaction(faction1)
  const alliance2 = allianceByFaction(faction2)

  if (alliance1 === alliance2) {
    // You can’t play against a faction in the same alliance (REDFOR/BLUFOR), the EXCEPTION for this is the independent factions.
    return alliance1 === 'INDEPENDENT'
  }

  return true
}

function pickTeam (faction: Faction, team: Team): Faction {
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
