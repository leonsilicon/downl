import { type DecompressOptions } from 'decompress'
import { type OptionsInit as GotOptions } from 'got'

export interface DownloadOptions extends GotOptions {
	/**
	 * If set to `true`, try extracting the file using
	 * [`decompress`](https://github.com/kevva/decompress).
	 *
	 * @default false
	 */
	extract?: false | DecompressOptions

	/**
	 * Name of the saved file.
	 */
	filename?: string | undefined
}