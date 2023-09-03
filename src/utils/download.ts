import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";

// @ts-expect-error: no typings
import archiveType from "archive-type";
import contentDisposition from "content-disposition";
import decompress from "decompress";
// @ts-expect-error: no typings
import extName from "ext-name";
import { fileTypeFromBuffer } from "file-type";
import filenamify from "filenamify";
import getStream from "get-stream";
import got, {
  type OptionsInit as GotOptions,
  type Request,
  type Response,
} from "got";
import omit from "just-omit";
import makeDir from "make-dir";
import { pEvent } from "p-event";

import { type DownloadOptions } from "~/types/options.js";

const filenameFromPath = (res: Response) =>
  path.basename(new URL(res.requestUrl).pathname);

const getExtFromMime = (res: Response): string | null => {
  const header = res.headers["content-type"];

  if (!header) {
    return null;
  }

  const exts = extName.mime(header);

  if (exts.length !== 1) {
    return null;
  }

  return exts[0].ext;
};

const getFilename = async (res: Response, data: string): Promise<string> => {
  const header = res.headers["content-disposition"];

  if (header) {
    const parsed = contentDisposition.parse(header);

    return parsed.parameters.filename!;
  }

  let filename = filenameFromPath(res);

  if (!path.extname(filename)) {
    const fileType = await fileTypeFromBuffer(Buffer.from(data));
    const ext = fileType?.ext ?? getExtFromMime(res);

    if (ext) {
      filename = `${filename}.${ext}`;
    }
  }

  return filename;
};

export default function download(
  url: string,
  destination?: string,
  options?: DownloadOptions
): Promise<Buffer> & Request;
export default function download(
  url: string,
  options?: DownloadOptions
): Promise<Buffer> & Request;
export default function download(
  uri: string,
  destinationOrOptions?: string | DownloadOptions,
  maybeOptions?: DownloadOptions
): Promise<Buffer> & Request {
  const destination =
    typeof destinationOrOptions === "string" ? destinationOrOptions : undefined;
  const optionsArg =
    typeof destinationOrOptions === "object"
      ? destinationOrOptions
      : maybeOptions;

  const options = {
    responseType: "buffer",
    ...optionsArg,
    isStream: true,
  } satisfies GotOptions;

  const gotOptions = omit(options, ["filename", "extract"]);

  const stream = got.stream(uri, gotOptions);

  const promise = pEvent(stream, "response")
    .then(async (res) =>
      Promise.all([
        getStream(stream, {
          // @ts-expect-error: 'buffer' is necessary
          encoding: optionsArg?.encoding ?? "buffer",
        }),
        res,
      ])
    )
    .then(async (result) => {
      const [data, res] = result;

      if (!destination) {
        return options.extract && archiveType(data)
          ? decompress(data, options.extract)
          : data;
      }

      const filename =
        options.filename ?? filenamify(await getFilename(res, data));
      const outputFilepath = path.join(destination, filename);

      if (options.extract && archiveType(data)) {
        return decompress(
          data,
          path.dirname(outputFilepath),
          options.extract
        );
      }

      return makeDir(path.dirname(outputFilepath))
        .then(async () => fs.promises.writeFile(outputFilepath, data))
        .then(() => data);
    });

  // @ts-expect-error: we want to make stream a promise
  // eslint-disable-next-line unicorn/no-thenable -- we want to make stream a promise
  stream.then = promise.then.bind(promise);
  // @ts-expect-error: we want to make stream a promise
  stream.catch = promise.catch.bind(promise);
  // @ts-expect-error: we want to make stream a promise
  stream.finally = promise.finally.bind(promise);

  return stream as Promise<Buffer> & Request;
}
