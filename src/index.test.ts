import { expect } from 'chai'
import mocha from 'mocha'
import { parseLayerinfo, parseLayerName, generateRotations } from './index.js'

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

  describe.only('generateRotations',  () => {
    it('should generate rotations correctly without filters', async () => {
      const layerInfo = await parseLayerinfo('./layerinfo.csv')
      const result = generateRotations(layerInfo, {})
      console.log(result)
    })
  })

