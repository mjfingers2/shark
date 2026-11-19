import '../host-catalog/host-profile'

// The parsers live apart so the page bundle reaches them without the host profile's module graph.
export {
  decodePairingUrl,
  extractPairingCodeFromUrl,
  parsePairingCode
} from './pairing-code'
