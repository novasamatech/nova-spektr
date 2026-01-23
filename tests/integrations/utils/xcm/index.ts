/**
 * XCM (Cross-Chain Messaging) utilities
 *
 * Tools for testing XCM functionality including:
 *
 * - Destination collection and filtering
 * - Whitelist/blacklist management
 * - Statistics and reporting
 */

export {
  collectXcmDestinations,
  collectXcmDestinationsWithStats,
  formatXcmDestinationsMarkdown,
  getChainBySpellName,
  saveXcmDestinationsToFile,
  type XcmDestination,
  type XcmDestinationStats,
} from './xcmDestinationsCollector';
