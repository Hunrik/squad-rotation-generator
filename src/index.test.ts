import { expect } from 'chai'
import mocha from 'mocha'
import { parseLayerinfo, parseLayerName, generateRotations, allianceByFaction } from './index.js'

describe('parseLayerinfo', () => {
  it('should parse layer name', async () => {
    const layer = parseLayerName('Skorpo_Skirmish_v1')
    expect(layer).to.have.property('name', 'Skorpo_Skirmish_v1')
    expect(layer).to.have.property('layerType', 'Skirmish')
    expect(layer).to.have.property('level', 'Skorpo')
    expect(layer).to.have.property('version', 'v1')
  })
  it('should parse maps correctly', async () => {
    const result = await parseLayerinfo('./layerinfo.csv')
    expect(result).to.have.property('Skorpo')
  })

  it('should parse layers correctly', async () => {
    const result = await parseLayerinfo('./layerinfo.csv')
    const map = result.Skorpo

    expect(map).to.have.property('levelName', 'Skorpo')
    expect(map).to.have.property('layers')
    expect(map.layers).to.have.property('Skorpo_Invasion_v1')
    expect(map.layers).to.have.property('Skorpo_Invasion_v2')
    expect(map.layers).to.have.property('Skorpo_RAAS_v1')
    expect(map.layers).to.have.property('Skorpo_Skirmish_v1')

    const layer = map.layers.Skorpo_Invasion_v1

    expect(layer).to.have.property('name', 'Skorpo_Invasion_v1')
    expect(layer).to.have.property('layerType', 'Invasion')
    expect(layer).to.have.property('version', 'v1')
    expect(layer).to.have.property('level', 'Skorpo')
  })

  it('should parse factions correctly', async () => {
    const result = await parseLayerinfo('./layerinfo.csv')
    const map = result.Skorpo
    const layer = map.layers.Skorpo_Invasion_v1
    const factions = layer.factions

    expect(factions).to.have.length(16)

    const BAF = factions[0]

    expect(BAF).to.have.property('name', 'BAF')
    expect(BAF).to.have.property('units')
    expect(BAF.units).to.have.length(5)

    expect(BAF.units).to.have.deep.members([
      { name: '3rd Division Battle Group', type: 'CombinedArms', availableOnTeam: 'Team1' },
      { name: 'Parachute Regiment', type: 'AirAssault', availableOnTeam: 'Team1' },
      { name: "Queen's Royal Hussars Battle Group", type: 'Armored', availableOnTeam: 'Team1' },
      { name: '1 Yorks Battle Group', type: 'Mechanized', availableOnTeam: 'Team1' },
      { name: 'Royal Logistics Corps Battle Group', type: 'Support', availableOnTeam: 'Team1' }
    ])
  })
})

describe.only('generateRotations', () => {
  it('should generate only  valid rotations', async () => {
    const layerInfo = await parseLayerinfo('./layerinfo.csv')
    const result = generateRotations(layerInfo, {})

    // rotation by map
    const rotationsByMap = result.reduce((acc, rotation) => {
      if (!acc[rotation.layer]) {
        acc[rotation.layer] = [{ team1: rotation.team1, team2: rotation.team2 }]
      } else {
        acc[rotation.layer] = [...acc[rotation.layer], { team1: rotation.team1, team2: rotation.team2 }]
      }
      return acc
    }, {})

    Object.keys(rotationsByMap).forEach(map => {
      const rotations = rotationsByMap[map]

      // Should not have teams playing against themselves
      rotations.forEach(rotation => {
        expect(rotation.team1).to.not.equal(rotation.team2)
      })

      // Should take FactionAlliance into consideration
      rotations.forEach(rotation => {
        const alliance1 = allianceByFaction(rotation.team1)
        const alliance2 = allianceByFaction(rotation.team2)
        if (alliance1 === 'INDEPENDENT' || alliance2 === 'INDEPENDENT') {
          return
        }
        expect(alliance1).to.not.equal(alliance2)
      })
    })
  })
  it('should generate only Skorpo rotations with map filter', async () => {
    const layerInfo = await parseLayerinfo('./layerinfo.csv')
    const result = generateRotations(layerInfo, { maps: ['Skorpo'] })
    expect(result).to.not.have.length(0)

    result.forEach(rotation => {
      expect(rotation.layer).to.match(/^Skorpo/)
    })
  })

  it('should generate only Invasion rotations with gameModes filter', async () => {
    const layerInfo = await parseLayerinfo('./layerinfo.csv')
    const result = generateRotations(layerInfo, { gameModes: ['Invasion'] })
    expect(result).to.not.have.length(0)

    result.forEach(rotation => {
      expect(rotation.layer).to.match(/Invasion/)
    })
  })

  it('should generate rotations filtered to a gamemode', async () => {
    const layerInfo = await parseLayerinfo('./layerinfo.csv')
    const result = generateRotations(layerInfo, { gameModes: ['Skirmish'] })
    expect(result).to.not.have.length(0)

    result.forEach(rotation => {
      expect(rotation.layer).to.match(/Skirmish/)
    })
  })

  it('should generate rotations with involving a faction based on factions filter', async () => {
    const layerInfo = await parseLayerinfo('./layerinfo.csv')
    const result = generateRotations(layerInfo, { factions: ['VDV'] })
    expect(result).to.not.have.length(0)

    result.forEach(rotation => {
      if (rotation.team1 !== 'VDV' && rotation.team2 !== 'VDV') {
        throw new Error(`VDV not found in rotation ${rotation.layer}-${rotation.team1}-${rotation.team2}`)
      }
    })

    // rotations should be unique
    const uniqueRotations = result.map(rotation => `${rotation.layer}-${rotation.team1}-${rotation.team2}`)
    expect(uniqueRotations).to.have.length(new Set(uniqueRotations).size)
  })
})
